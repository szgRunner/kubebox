'use strict';

const blessed = require('blessed');

const { highlight, plain } = require('cli-highlight');
const { focus: { focusIndicator }, spinner: { until }} = require('./ui');
const { scroll, throttle } = require('./blessed/scroll');

function Yaml(screen, yamlLabel) {
  // TODO: add filtering

  const yaml_table = blessed.with( focusIndicator, scroll, throttle).listtable({
    parent: screen,
    label:  yamlLabel,
    top: 1,
    width: '100%',
    height: '100%-1',
    border: 'line',
    align: 'left',
    keys: true,
    tags: true,
    mouse: true,
    noCellBorders: true,
    invertSelected: false,
    scrollbar: {
      ch: ' ',
      style: { bg: 'white' },
      track: {
        style: { bg: 'grey' },
      },
    },
    style: {
      label: { bold: true },
      header: { fg: 'grey' },
      cell: { selected: { bold: true, fg: 'black', bg: 'white' } },
    },
  }
  );

  return { yaml_table }
}

function fillPodYaml(screen, client, namespace, podName) {

  const label = `${namespace}-${podName}-Yaml`;
  const { yaml_table } = Yaml(screen, label);

  const { promise, _ } = client.pod(namespace, podName).asYaml().get({ cancellable: true, rejectOnAbort: true });
  until(promise)
    .do(yaml_table, yaml_table.setLabel).spin(s => `${s} Yaml`).fail(_ => 'Yaml')
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

module.exports = fillPodYaml;
