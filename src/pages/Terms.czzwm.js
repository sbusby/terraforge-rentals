$w.onReady(function () {
  $w('#html1').height = 8000;
  $w('#html1').onMessage(function(event) {
    if (event.data && event.data.type === 'setHeight') {
      $w('#html1').height = event.data.height + 40;
    }
  });
});