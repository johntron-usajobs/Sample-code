'''

**Madlib-Generator**

This was one of many freelance projects I used to support myself financially for a few years. I created an online form for the client to generate content by creating random permutations of specially formatted "madlib" content. The client would write a madlib message that includes groups of alternative words or phrases throughout the message. For example, "The {quick|fat} {brown|blue|orange} {dog|pig|cat|cow} jumped over the {tall fence|fence}". My script then parses the madlib script, chooses one random phrase from each group of words/phrases, and outputs one piece of unique content. The script then continues doing so as many times as the client specified. This will result in dozens or hundreds of unique pieces of content with little effort. 

This file is the Model of the project and includes the business logic for converting a madlib message into many pieces of unique content. Note: This project was created using Django.

'''

import random
from copy import copy
from madlib.generator.tokenizer import MadlibTokenizer

class MarkupException( Exception ):
    pass

class Madlib:
    tokens = []
    
    def parse( self, script ):
        if script.count( '{' ) != script.count( '}' ):
            raise MarkupException( 'Unmatched brackets. You either have too many or not enough {\'s or }\'s.')
        self.tokens = []
        t = MadlibTokenizer()
        t.tokenize( script )
        self.tokens = t.tokens
        
    def generate( self ):
        script = ''
        tokens = copy( self.tokens )

        while len( tokens ):
            token = tokens.pop(0)
            
            # Two possibilities: normal string or group of phrases
            if token == '{':
                # Start parsing phrases
                            
                phrases = []
                
                # Store each phrase inside the {}'s
                while 1:
                    # Get the phrase
                    phrase = tokens.pop(0)
                    
                    # Parse any subphrases
                    if phrase.find( '{' ) >= 0:
                        m = Madlib()
                        m.parse( phrase )
                        phrase = m.generate()
                        
                    # Store phrase
                    phrases += [phrase]
                    
                    # Get next token (should be '|' or '}')
                    token = tokens.pop(0)
                    
                    # '}' denotes end of phrase group
                    if token == '}':
                        break
                # Done compiling phrases
                
                # Now choose one
                script += phrases[ random.randint(0, len( phrases ) - 1 ) ]
            else:
                # Just a normal string
                script += token
        return script
