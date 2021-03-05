'use strict'

const blessed = require('blessed');
const { setLabel, spinner: { until } } = require('./ui');
const { scroll, throttle } = require('./blessed/scroll');

function pods_ui(screen) {
    const box = blessed.box({
        top: 'center',
        left: 'center',
        width: '50%',
        height: '50%',
        label: 'PodsQuery',
        border: 'line',
        style: {
            label: { bold: true },
        },
    });

    const list = blessed.with(scroll, throttle).list({
        parent: box,
        height: 'shrink',
        bottom: 0,
        align: 'left',
        top: 4,
        width: '100%',
        keys: true,
        tags: true,
        mouse: true,
        border: 'line',
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
            selected: { bold: true, fg: 'black', bg: 'white' },
        },
    });

    blessed.text({
        parent: box,
        left: 2,
        top: 2,
        align: 'left',
        content: 'Pod:',
    });

    const searchPod = blessed.textbox({
        parent: box,
        border: 'line',
        width: '100%-11',
        height: 3,
        top: 1,
        right: 1,
        inputOnFocus: true,
    });

    return { searchPod, box, list };
}

function promptPod(screen, client, { current_namespace, promptAfterRequest } = { promptAfterRequest: false }) {
    return new Promise(function (fulfill, reject) {
        const { searchPod, box, list } = pods_ui(screen);
        let pods = [], message;

        // Canonical way of extending components in Blessed

        //Pods
        searchPod.__oolistenerPod = searchPod._listener;
        searchPod._listener = function (ch, key) {
            if (['up', 'down', 'pageup', 'pagedown', 'enter'].includes(key.name)) {
                return list.emit('keypress', ch, key);
            }
            const retPod = this.__oolistenerPod(ch, key);
            updatePodList();
            screen.render();
            return retPod;
        };

        function updatePodList() {
            const items = (pods.items || [])
                .filter(n => n.metadata.name.includes(searchPod.value))
                .map(n => {
                    const item = n.metadata.name;
                    // const regex = new RegExp(searchPod.value, 'g');
                    let match, lastIndex = 0, res = '';
                    // while ((match = regex.exec(item)) !== null) {
                    //     res += item.substring(lastIndex, match.index) + '{yellow-fg}' + searchPod.value + '{/yellow-fg}';
                    //     lastIndex = regex.lastIndex;
                    // }
                    res += item.substring(lastIndex);
                    return res;
                });
            list.setItems(items);
        }

        function request_pods() {
            return (client.openshift ? client.projects().get() : client.pods(current_namespace).get())
                .then(response => {
                    pods = JSON.parse(response.body.toString('utf8'));
                    if (pods.items.length === 0) {
                        list_message('No available pods');
                    } else {
                        updatePodList();
                        // if (current_pod) {
                        //     const selected = pods.items
                        //         .filter(n => n.metadata.name.includes(searchPod.value))
                        //     list.select(selected);
                        //     if (selected > list.height / 2 - 1) {
                        //         // Scroll to center the selected item
                        //         list.childOffset += list.height / 2 - 1 | 0;
                        //         list.scrollTo(selected);
                        //     }
                        // }
                        screen.render();
                    }
                });
        }

        function prompt_pods_ui() {
            screen.saveFocus();
            screen.grabKeys = true;
            screen.grabMouse = true;
            screen.append(box);
            searchPod.focus();
            list.grabMouse = true;
            screen.render();
        }

        function close_pods_ui() {
            box.detach();
            screen.restoreFocus();
            screen.grabKeys = false;
            screen.grabMouse = false;
            screen.render();
        }

        function list_message(text, options = {}) {
            if (message) message.destroy();
            message = blessed.text(Object.assign({
                parent: list,
                tags: true,
                top: '50%-1',
                left: 'center',
                width: 'shrink',
                height: 'shrink',
                align: 'center',
                valign: 'middle',
                content: text,
            }, options));
        }

        if (promptAfterRequest) {
            request_pods()
                .then(prompt_pods_ui)
                .catch(error => reject(error));    
        } else {
            prompt_pods_ui();
            until(request_pods())
                .do(box, setLabel).spin(s => `${s} Pods`).done(_ => 'Pods')
                .catch(error => {
                    close_pods_ui();
                    reject(error);
                });
        }

        searchPod.on('key escape', () => {
            close_pods_ui();
            // fulfill();
        });

        list.on('select', item => {
            if (item) {
                close_pods_ui();
                fulfill(blessed.helpers.cleanTags(item.getContent()));
            }
        });
    });
}

module.exports.promptPod = promptPod;
