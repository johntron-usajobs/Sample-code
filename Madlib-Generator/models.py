'''

**Madlib-Generator**

This is one of my oldest source code examples and one of many freelance projects I used to support myself financially for a few years. I created an online form for the client to generate content by creating random permutations of specially formatted "madlib" content. The client would write a madlib message that includes groups of alternative words or phrases throughout the message. For example, "The {quick|fat} {brown|blue|orange} {dog|pig|cat|cow} jumped over the {tall fence|fence}". My script then parses the madlib script, chooses one random phrase from each group of words/phrases, and outputs one piece of unique content. The script then continues doing so as many times as the client specified. This will result in dozens or hundreds of unique pieces of content with little effort. 

This file is the Model of the project and includes the business logic for converting a madlib message into many pieces of unique content. Note: This project was created using Django.

'''

import random
from copy import copy
from madlib.generator.tokenizer import MadlibTokenizer # I wrote this too!

class MarkupException( Exception ):
    pass

class Madlib:
    '''
    Madlib represents piece of madlib text. 
    '''

    tokens = []
        
    def generate( self ):
        script = '' # The output text

        tokens = copy( self.tokens )

        while len( tokens ):
            token = tokens.pop(0)
            
            # Two possibilities: normal string or beginning of a group of phrases
            if token == '{':
                # Start parsing phrases
                            
                phrases = []
                
                # From inside the {}'s, store each phrase 
                while 1:
                    # Get a phrase
                    phrase = tokens.pop(0)
                    
                    # Recursively parse nested phrase groups
                    if phrase.find( '{' ) >= 0:
                        m = Madlib()
                        m.parse( phrase )
                        phrase = m.generate() # Get output text from the nested phrases
                        
                    # Store phrase
                    phrases += [phrase]
                    
                    # Get next token (should be '|' or '}')
                    token = tokens.pop(0)
                    
                    # '}' denotes end of phrase group
                    if token == '}':
                        break

                # Done compiling phrases, now choose one randomly and append to script
                script += phrases[ random.randint(0, len( phrases ) - 1 ) ]
            else:
                # Just a normal string
                script += token

        return script
    
    def parse( self, script ):
        '''
        Performs validation and tokenizes input madlib texts

        TODO move this to a static method of MadlibTokenizer
        '''

        # Basic validation
        if script.count( '{' ) != script.count( '}' ):
            raise MarkupException( 'Unmatched brackets. You either have too many or not enough {\'s or }\'s.')
        self.tokens = [] # Unecessary
        t = MadlibTokenizer()
        t.tokenize( script ) # Tokenizes a madlib text into text and the control characters  {, }, and |.
        self.tokens = t.tokens