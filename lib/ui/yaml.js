'use strict';

const blessed = require('blessed'),
      EventEmitter = require('events');

const { SelectEvent} = require('./navbar');      
const { highlight, plain } = require('cli-highlight');
const { focus: { focusIndicator }, spinner: { until }} = require('./ui');
const { scroll, throttle } = require('./blessed/scroll');

class Yaml extends EventEmitter {
  constructor({ screen, client, status, namespace, podName }) {

    super();

    const label = `${namespace}-${podName}-Yaml`;
    const yaml_table = blessed.with( focusIndicator, scroll, throttle).box({
      parent: screen,
      label:  label,
      top: 1,
      width: '100%',
      height: '100%',
      border: 'line',
      align: 'left',
      keys   : true,
      tags   : true,
      mouse  : true,
      noCellBorders : true,
      scrollable    : true,
      scrollbar: {
        ch: ' ',
        style: { bg: 'white' },
        track: {
          style: { bg: 'grey' },
        },
      },
      style: {
        label: { bold: true },
        // header: { fg: 'grey' },
        // cell: { selected: { bold: true, fg: 'black', bg: 'white' } },
      },
    });



    this.on(SelectEvent, ({ screen }) => {
      screen.append(yaml_table);
      screen.append(status);
      fillPodYaml(client, namespace, podName);
    });

    function fillPodYaml(client, namespace, podName) {
    
      yaml_table.setContent('');
      // yaml_table.resetScroll();
    
      const { promise, _ } = client.pod(namespace, podName).asYaml().get({ cancellable: true, rejectOnAbort: true });
      until(promise)
        .do(yaml_table, yaml_table.setLabel).spin(s => `${s} Yaml`).fail(_ => 'Yaml')
        .succeed(_ => `Yaml {grey-fg}[${namespace}/${podName}]{/grey-fg}`)
        .then(response => {
          const yaml = response.body.toString('utf8');
          yaml_table.setContent(highlight(yaml, { language: 'yaml', ignoreIllegals: true, theme: { string: plain } }));
          yaml_table.screen.render();
        }).catch(error => {
          if (!error) return;
          //debug.log(`{red-fg}Error fetching event ${namespace}/${name}{/red-fg}`);
          yaml_table.setContent(`{red-fg}${error.toString()}{/red-fg}`);
          yaml_table.screen.render();
        });
        // screen.render();
    }

  }
}


module.exports = Yaml;
