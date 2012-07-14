John Syrinek's sourcecode samples
===========

This project includes some of the code I've written over the years.

**Madlib-Generator**

This is one of many freelance projects I used to support myself financially for a few years. I created an online form for the client to generate content by creating random permutations of specially formatted "madlib" content. The client would write a madlib message that includes groups of alternative words or phrases throughout the message. For example, "The {quick|fat} {brown|blue|orange} {dog|pig|cat|cow} jumped over the {tall fence|fence}". My script then parses the madlib script, chooses one random phrase from each group of words/phrases, and outputs one piece of unique content. The script then continues doing so as many times as the client specified.

I chose to include this file as sample code to show one of the more elegant solutions to a seemingly unsurmountable task: generating thousands of unique pieces of meaningful content in just a few minutes in a way that doesn't confuse an average person. Admittedly, this is probably the simplest of my code samples, but the logic includes many subleties. This was my very first Python script, and I unfortunately did not learn about Python's yield statement until after completion. Visit one version of this madlib generator at [madlib.johntron.com](http://madlib.johntron.com/ "Madlib generator")


**PlaceThings**

This was a project I cofounded at MobileLab while attending the University of Texas at Dallas. PlaceThings is a storytelling platform. It uses the iPhone to capture rich content such as photos, videos, audio, and text and attaches them location to a map. You can string this content together into a whole new kind of narrative, then share this narrative with friends and family by simply sending them a link. Others can then comment on your stories with the same kind of rich contnet. We offered a RESTful API to the public, and this code sample handles requests to this API.

**SplashCube**

A web service for people to easily manage and grow their own social communities on Twitter, Facebook, and LinkedIn. The software aggregates and analyzes customers accounts across all of these social networks and then provides a unified inbox, daily tasks, keyphrase monitoring, publishing, and automated marketing tools to help them meet their business objectives.
