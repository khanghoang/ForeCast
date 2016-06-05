import React, {Component} from 'react';
import CreatePatternForm from '../components/CreatePatternForm';
import genID from '../helpers/makeID';
import _ from 'lodash';
import CodeEditorComponent from '../components/CodeEditorComponent';
import AppBar from 'material-ui/AppBar';
import Toggle from 'material-ui/Toggle';

require('../../panel/panel.js');
// ^^ correct code aboveroot
const storage = chrome.storage.local;

class App extends Component {

  constructor() {
    super();

    this.state = {
      endableXHR: false,
      requests: [],
      patterns: []
    }
  }

  componentDidMount() {
    window.onDataChange = (data) => {
      console.table(data);
      this.setState({requests: data})
    }

    storage.get('patterns', (store) => {
      let patterns = store.patterns || [];
      if (patterns instanceof Error) {
        patterns = [];
      }

      this.setState({patterns: patterns});

      const dataString = JSON.stringify(patterns);
      var command = `
      const patterns = JSON.parse('${dataString}');
      window.patterns = patterns;
      `;
      chrome.devtools.inspectedWindow.eval(
        command,
        function(result, isException) {
          console.log(result, isException);
        }
      );
    });
  }

  clearCachedPatterns = () => {
    storage.clear(() => {
      console.log('cleared')
    });
  }

  onCreateRequest = (data) => {
    const pattern = _.assign({}, data, {_id: genID()});
    const dataString = JSON.stringify(pattern);
    var command = `
      let pattern = JSON.parse('${dataString}');
      window.patterns.push(pattern);
    `;

    const that = this;

    chrome.devtools.inspectedWindow.eval(
      command,
      (result, isException) => {
        console.log(result, isException);
        storage.get('patterns', (storedData) => {
          let patterns = storedData.patterns || [];
          const newPatterns = [...patterns, pattern];
          storage.set({patterns: newPatterns}, () => {
            console.log('Pattern stored');
            that.setState({patterns: newPatterns});
          });
        });

      }
    );
  }

  addPattern = (e) => {
    e.preventDefault();

    // get url
    const pattern = {
      url: this.refs.input.value
    };

    const newPatterns = [...this.state.patterns, pattern];
    this.setState({
      patterns: newPatterns
    }, _ => {
      this.refs.input.value = '';
    });
  }

  enableXHR = () => {
    var id = chrome.runtime.id;

    var command = `
      this.xhr = sinon.useFakeXMLHttpRequest();\
      this.xhr.onCreate = function (xhr) {\
        xhr._id = window.__makeID();
        requests.push(xhr);
        window.postMessage({hello: JSON.stringify(requests)}, '*');
        setTimeout(_ => {
          window.__vision_onCreateCallback(xhr);
        }, 0);
      };
    `;

    chrome.devtools.inspectedWindow.eval(
      command,
      function(result, isException) {
        console.log(result, isException);
      }
    );
  }

  disableXHR = () => {
    var command = `
      xhr.restore();
    `;

    chrome.devtools.inspectedWindow.eval(
      command,
      function(result, isException) {
        console.log(result, isException);
      }
    );
  }

  updatePatternsInLocalStorage(patterns, cb) {
    storage.set({patterns: patterns}, () => {
      cb(patterns);
    });
  }

  updatePatternsOnContentPageWithPatterns(patterns, cb) {
    const dataString = JSON.stringify(patterns);
    const command = `
    let patterns = JSON.parse('${dataString}');
    window.patterns = patterns;
    `;

    const that = this;

    chrome.devtools.inspectedWindow.eval(
      command,
      cb
    );
  }

  onToggle = () => {
    const isEnabled = !this.state.enableXHR;
    if (isEnabled) {
      this.enableXHR();
    } else {
      this.disableXHR();
    }

    this.setState({
      enableXHR: isEnabled
    });
  }

  onDeletePattern(patternID) {
    const patterns = _.filter(this.state.patterns, (p) => {
      return p._id !== patternID;
    });

    this.setState({patterns: patterns}, () => {
      const updateFunc = this.updatePatternsOnContentPageWithPatterns;
      updateFunc(patterns,
                 (result, isException) => {
                   this.updatePatternsInLocalStorage(patterns);
                 }
                );
    });

  }

  render() {

    const groupPatterns = this.state.patterns.map((pattern) => {
      return (
        <li>{pattern.url}
        <button onClick={(e) => {
          e.preventDefault();
          this.onDeletePattern(pattern._id);
        }}>Delete</button>
        </li>
      )
    });

    const groupBtns = this.state.requests.map((q) => {
      const id = q._id;
      return (
        <button
          onClick={
            () => {
              // command to trigger to response the request
              const command = `
                console.log('click button');
                window.__returnOriginResultWithRequestID('${id}')
              `;

              chrome.devtools.inspectedWindow.eval(
                command,
                function(result, isException) {
                  console.log(result, isException);
                }
              );
            }
          }
          type="button"
          className="btn btn-success">
          {`Release the request ${id}`}
        </button>
      )
    });

    return (
      <div>
        <AppBar
          title="Vision"
          children={
            <Toggle
              label="Enable Mock"
              labelPosition="right"
              toggled={this.state.enableXHR}
              onToggle={this.onToggle}
              style={{
                'width': '150px',
                'float': 'right',
                'margin': 'auto 0'
              }}
              labelStyle={{
                'color': '#fff',
                'font-size': '12px'
              }}
              />
          }
          />
        <div style={{"margin": "24px;"}} >
          <button onClick={this.clearCachedPatterns} type="button" className="btn btn-danger">clear Cached Patterns</button>
          <ul>
            {groupPatterns}
            </ul>
            {groupBtns}
            <CreatePatternForm
              onSubmit={this.onCreateRequest}
              />
        </div>
      </div>
    );
  }
}

export default App;
