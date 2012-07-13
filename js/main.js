/* Author: John Syrinek

*/

$(function() {

    $('.cta').on('click.sample-code', function(e) {
        var $target = $(e.target);
        if ( $target.hasClass('frontend') ) {

        } else if ( $target.hasClass('backend') ) {

        }
    }); 

});
