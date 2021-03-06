var backgroundPageConnection = chrome.runtime.connect({
  name: 'panel'
});

backgroundPageConnection.onMessage.addListener(function(msg) {
  add('button', 'Response with mock data');
});

function add(type, name) {
    //Create an input type dynamically.
    var element = document.createElement("input");
    element.type = type;
    element.value = name;
    element.onclick = function() {
      var command = `
      window.requests[0].respond(200, { "Content-Type": "application/json" },
                                 '{ "id": 12, "comment": "Hey there", "token": "123"}');
      `;

      chrome.devtools.inspectedWindow.eval(
        command,
        function(result, isException) {
          console.log(result, isException);
        }
      );
    };

    // FIXME: bad way to appending stuff
    var foo = document.getElementById("container2");
    //Append the element in page (in span).
    foo.appendChild(element);
}
