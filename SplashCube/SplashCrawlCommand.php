<?php

/**

**SplashCube**

SplashCube has many parts, including a queue-based Scheduler, Crawler, and Processor system to keep linked social accounts up to date. The system worked out really well – thousands of linked accounts are updated every few minutes. The system works so well that SplashMedia's notice outages or delays in *other* services like Twitter, Facebook, HootSuite before most people enabling them to proactively warn an appropriate parties of these interruptions. 

This file implements a console command I created to spawn a crawler daemon responsible for pulling update requests out of the queue, fetching the appropriate data from any of the various third-party APIs we use, and then serializing this data for insertion back into the queue (to be handled by the Processor). I designed the system so we have the ability to simply launch a new crawler process and increase capacity. We have done this twice since inception, and had no issues. This project uses Symfony 2.

**/

namespace SplashMedia\Bundle\CubeListenBundle\Command;

use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Output\Output;
use SplashMedia\Bundle\CubeListenBundle\Crawler\Queue;
use SplashMedia\Bundle\CubeListenBundle\Crawler\Request;
use SplashMedia\Bundle\CubeListenBundle\Crawler\ConnectionPool;
use SplashMedia\Bundle\CubeListenBundle\Crawler\WorkerPool;
use SplashMedia\Bundle\OxygenBundle\Serializer\Factory as SerializerFactory;
use SplashMedia\Bundle\OxygenBundle\Serializer\Crawler\Request as RequestSerializer;
use SplashMedia\Bundle\OxygenBundle\Entity\LinkedAccount;
use SplashMedia\Bundle\CubeListenBundle\Crawler\Connection\Exception as ConnectionException;
use SplashMedia\Bundle\CubeListenBundle\Crawler\Worker\WorkerException;
use SplashMedia\Bundle\CubeListenBundle\ErrorMailer;
use SplashMedia\Bundle\CubeListenBundle\Crawler\Request\Interactions as InteractionsRequest;
use \Pheanstalk_Job;
use \FacebookApiException;
use SplashMedia\Bundle\CubeListenBundle\Crawler\ExceptionHandler;

/**
 * SplashCrawler.
 *
 * @author johntron
 */
class SplashCrawlCommand extends ContainerAwareCommand {

    private $enabledConnections = array(
        'twitter',
        'facebook',
        'linkedin'
    );

    /**
     * @see Command
     */
    protected function configure() {
        $this
                ->setName('splash:crawl')
                ->setDescription('Run the crawler to update users')
                ->setDefinition(array(
                    new InputArgument('linked_account_id', InputArgument::OPTIONAL, 'The linked account ID'),
                ))
                ->setHelp(<<<EOT
The <info>splash:crawl</info> command crawls social networks for new user data.

  <info>php app/console splash:crawl</info>
EOT
        );
    }

    /**
     * Uses a pool of HTTP connections and Worker objects to fetch raw data 
     * from various APIs based on requests it receives from a queue. This data 
     * is later used by a separate process to update the production database. 
     * 
     * @param InputInterface $input
     * @param OutputInterface $output 
     */
    protected function execute(InputInterface $input, OutputInterface $output) {
        set_time_limit(0);
        ini_set('memory_limit', '1500M');

        $pid = posix_getpid();
        $base_path = $this->getContainer()->get('kernel')->getRootDir() . '/../crawl.pid';
        file_put_contents($base_path, $pid);

        if ($input->getArgument('linked_account_id')) {
            $account = $this->getContainer()->get('doctrine.orm.entity_manager')
                    ->getRepository('SplashMediaOxygenBundle:LinkedAccount')
                    ->find($input->getArgument('linked_account_id'));
            $requestsToHandle = array(
                sprintf('request_interactions_%s', $account->getChannelName()),
                sprintf('request_post_%s', $account->getChannelName())
            );
            $enabledConnections = array($account->getChannelName());
        } else {
            $requestsToHandle = $this->getRequestsToHandle();
            $enabledConnections = $this->enabledConnections;
        }
        $beanstalk_host = $this->getContainer()->getParameter('beanstalk_host');
        $inputQueue = new Queue($requestsToHandle, $beanstalk_host); // Data source for crawl requests
        $outputQueue = new Queue(null, $beanstalk_host); // Destination for crawl results
        
        // Build pool of APIs
        $connections = new ConnectionPool();
        foreach ($enabledConnections as $connection) {
            $connections->add(ConnectionPool::factory($connection, $this->getContainer()));
            $output->writeln('Connected to ' . $connection);
        }

        // Build pool of workers
        $workers = new WorkerPool();
        $workerOptions = array();
        foreach ($requestsToHandle as $request_type) {
            $workers->add(WorkerPool::factory($request_type, $workerOptions));
            $output->writeln('Loaded worker for: ' . $request_type);
        }

        // Grab crawl requests from queue and delete from queue immediately
        while ($job = $inputQueue->reserve()) {
            try {
                $request = RequestSerializer::unserialize((array) json_decode($job->getData(), true));
                if (!$request->isValid()) {
                    throw new \Exception('Request is invalid: ' . $request);
                }

                // Get appropriate worker and connection
                $beginMicrotime = microtime(true);
                $worker = $workers->getWorkerForRequest($request);
                if (null === $worker) {
                    $output->writeln('No worker for Request ' . $request . ', releasing');
                    $inputQueue->release($job);
                }
                $connection = $connections->getConnectionForWorker($worker);
                
                if ( $connection->isWaiting() ) {
                    if ( $request instanceof InteractionsRequest ) {
                        $output->writeln('still throttle limited, deleting update-interactions job');
                        $inputQueue->delete($job);
                    } else {
//                        $output->writeln('still throttle limited, releasing job');
                        $inputQueue->release($job, \Pheanstalk::DEFAULT_PRIORITY, 3);
                    }
                    usleep($workers->getWaitTimeInMicroseconds());
                    continue;
                }

                // Do the work
                $output->write('Using worker ' . $worker . ' with connection ' . $connection . ' for request ' . $request . ' ... ');
                $result = $worker->run($request, $connection);
                $output->writeln('done');

                // Store the result
                $output->write('Storing results ... ');
                $outputQueue->push( Queue::getResultTubeForRequest($request), $result);
                $output->writeln('done');
                $output->writeln((microtime(true) - $beginMicrotime) * 1000 . 'ms');

                // Completed successfully, remove from queue
                $inputQueue->delete($job);

                // Wait
                // May wait longer than normal if throttle limited
                $connection->reachedThrottleLimit( false ); // Reset if we got some data
                $sleepTime = $workers->getWaitTimeInMicroseconds();
                $output->writeln('Sleeping for ' . $sleepTime . ' microseconds');
                usleep($sleepTime);
            } catch (\Exception $e) {
                if (false !== stripos($e->getMessage(), 'Could not authenticate with OAuth')
                    || false !== stripos( $e->getMessage(), 'Invalid OAuth access token' )
                    || false !== stripos($e->getMessage(), 'The token used in the OAuth request is not valid')
                    || false !== stripos( $e->getMessage(), 'Could not authenticate you' )
                    || false !== stripos( $e->getMessage(), 'unauthorized' )
                    || false !== stripos( $e->getMessage(), 'session has been invalidated' )
                    || false !== stripos( $e->getMessage(), 'Session has expired' )
                    || false !== stripos( $e->getMessage(), 'Session does not match current stored session' )
                    || false !== stripos( $e->getMessage(), 'not authorized' )
                    || false !== stripos( $e->getMessage(), 'Error validating access token' )
                    || false !== stripos( $e->getMessage(), 'User has been suspended' ) ) {

                    $output->write('Invalid OAuth, updating account ... ');
                    $em = $this->getContainer()->get('doctrine.orm.entity_manager');
                    $linkedAccount = $em->getRepository('SplashMediaOxygenBundle:LinkedAccount')->find($request->getLinkedAccountId());


                    if ($request->getAccessToken() != $linkedAccount->getAccessToken()) {

                        //Update access token
                        $data = (array) json_decode($job->getData(), true);
                        $data['token'] = $linkedAccount->getAccessToken();

                        $output->write( 'new access token, retrying or burying ...' );
                        ExceptionHandler::retryOrBury($this->getContainer(), $inputQueue, $job, $e, $output, $data);
                    } else {
                        if ($linkedAccount instanceOf LinkedAccount) {
                            $linkedAccount->setStatus(LinkedAccount::invalid_oauth);
                            $linkedAccount->setIsActive(false);
                            $em->persist($linkedAccount);
                            $em->flush();

                            $output->write('Deleting job ...');
                        } else {
                            $output->write('Cannot find linked account #' . $request->getLinkedAccountId() . ', deleting job ...');
                        }
                        $inputQueue->delete($job);
                    }

                } elseif ($e instanceof WorkerException && WorkerException::NO_FACEBOOK_PAGE_ID == $e->getCode()) {

                    $output->write('No Facebook Page ID ... ');
                    $em = $this->getContainer()->get('doctrine.orm.entity_manager');
                    $linkedAccount = $em->getRepository('SplashMediaOxygenBundle:LinkedAccount')->find($request->getLinkedAccountId());
                    if ($linkedAccount instanceOf LinkedAccount) {
                        $linkedAccount->setStatus(LinkedAccount::incomplete);
                        $linkedAccount->setIsActive(false);
                        $em->persist($linkedAccount);
                        $em->flush();
                        $output->write('Deleting job ...');
                    } else {
                        $output->write('Cannot find linked account #' . $request->getLinkedAccountId() . ', deleting job ...');
                    }
                    $inputQueue->delete($job);

                } elseif ( false !== stripos($e->getMessage(), 'timed out') || false !== stripos($e->getMessage(), 'timeout' ) ) {

                    $output->write( 'timed out, requeueing/burying ...' );
                    ExceptionHandler::retryOrBury($this->getContainer(), $inputQueue, $job, $e, $output);

                } elseif (false !== stripos($e->getMessage(), 'throttle limit') ) {

                    $connection->reachedThrottleLimit();
                    $output->write( 'Throttle limit reached, releasing job and waiting ' . $connection->getWaitTimeInSeconds() . ' seconds...' );
                    $inputQueue->release($job, \Pheanstalk::DEFAULT_PRIORITY, 3);
                    $msg = 'waiting ' . $connection->getWaitTimeInSeconds() . ' seconds, request: ' . $request . ', job #' . $job->getId();
                    ExceptionHandler::output($e);
                    ExceptionHandler::notify($this->getContainer(), $e, $msg);

                } else {

                    // Unknown exception
                    $output->write('Job #' . $job->getId() . ' failed, requeuing/burying ...');
                    $msg = 'job #' . $job->getId();
                    if ( isset( $request ) ) {
                        $msg .= ', request: ' . $request;
                    }
                    ExceptionHandler::output($e);
                    ExceptionHandler::notify($this->getContainer(), $e, $msg);
                    ExceptionHandler::retryOrBury($this->getContainer(), $inputQueue, $job, $e, $output);
                }
                
                $output->writeln('done');
            }
        }
    }

    protected function interact(InputInterface $input, OutputInterface $output) {
        return;
    }

    private function getRequestsToHandle() {
        $requestsToHandle = array();
        if ( $this->getContainer()->getParameter('splashcube.crawler.publishing_enabled' ) ) {
            $requestsToHandle = array_merge( $requestsToHandle, array(
                'request_post_twitter',
                'request_post_facebook',
                'request_post_linkedin'
            ));
        }
        if ( $this->getContainer()->getParameter('splashcube.crawler.everything_else' ) ) {
            $requestsToHandle = array_merge( $requestsToHandle, array(
                'request_interactions_twitter',
                'request_interactions_facebook',
                'request_interactions_linkedin',
            ));
        }
        return $requestsToHandle;
    }
}
