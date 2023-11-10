const listeners = new Map()

function AddListener(event, callback, component) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push({ callback, component });
}

function RemoveListener(event, component) {
    if (listeners.has(event)) {
        const event_listeners = listeners.get(event).filter(listener => (
            listener.component !== component
        ));

        if (event_listeners.length > 0) {
            listeners.set(event, event_listeners);
        } else {
            listeners.delete(event);
        }
    }
}

const MixIn = {
    beforeCreate(){
        if(!this.sockets) this.sockets = {};
        this.sockets.subscribe = (event, callback) => {
            AddListener(event, callback, this);
        };

        this.sockets.unsubscribe = (event) => {
            RemoveListener(event, this);
        };
        // this.sockets.connect = (callback) => {
        //     AddListener('connect', callback, this);
        // }
        // this.sockets.disconnect = (callback) => {
        //     AddListener('disconnect', callback, this);
        // }
        // this.sockets.error = (callback) => {
        //     AddListener('error', callback, this);
        // }

    },
    mounted(){
        if(this.$options.sockets){
            Object.keys(this.$options.sockets).forEach(event => {
                if(event !== 'subscribe' && event !== 'unsubscribe') {
                    AddListener(event, this.$options.sockets[event], this);
                }
            });
        }
    },
    beforeDestroy(){
        console.log('before destroy', this.$options)
        if(this.$options.sockets){
            Object.keys(this.$options.sockets).forEach(event => {
                RemoveListener(event, this);
            });
        }
    }
}
export default {
    install: (app, options) => {
        app.config.globalProperties.$websocket = {
            instance: null,
            init: function (url) {
                app.mixin(MixIn)
                this.url = url
                this.instance = new WebSocket(url);
                this.bind()
                this.interval = setInterval(() => {
                    if(this.instance.readyState === 3) {
                        if(this.manualClose) {
                            clearInterval(this.interval)
                        }else{
                            this.instance = new WebSocket(this.url);
                            this.bind()
                        }
                    }
                    if(this.instance.readyState === 1) this.instance.send('ping')
                }, 10000)
            },
            bind: function(){
                this.instance.onopen =  () => {
                    this.instance.send('ping')
                    if(listeners.has('connect')) {
                        listeners.get('connect').forEach(listener => {
                            listener.callback.call(listener.component)
                        })
                    }
                };
                this.instance.onmessage = function (evt) {
                    const Reg = /^(\w+)\|(.*)$/
                    const match = evt.data.match(Reg)
                    if(match) {
                        const event = match[1]
                        const data = JSON.parse(match[2])
                        if(listeners.has(event)) {
                            listeners.get(event).forEach(listener => {
                                listener.callback.call(listener.component, data)
                            })
                        }
                    }
                };
                this.instance.onclose = function () {
                    if(listeners.has('disconnect')) {
                        listeners.get('disconnect').forEach(listener => {
                            listener.callback.call(listener.component)
                        })
                    }
                };
                this.instance.onerror = function () {
                    if(listeners.has('error')) {
                        listeners.get('error').forEach(listener => {
                            listener.callback.call(listener.component)
                        })
                    }
                };

            },
            send: function (topic, msg) {
                if(msg==null){
                    if(typeof topic==='object') msg = JSON.stringify(topic)
                    msg = `message|${topic}`
                }else{
                    if(typeof msg==='object') msg = JSON.stringify(msg)
                    msg = `${topic||'message'}|${msg}`
                }
                this.instance.send(msg);
            },
            close: function () {
                this.manualClose = true
                this.instance.close();
            },
        };
    }
}