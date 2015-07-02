(function (root) {
    var modules = {};
    var callbacks = [];
    var isDebug = false;

    // Utilities functions
    function log(s) {
        if (isDebug && root.console && root.console.log)
            root.console.log(s);
    }

    function log_error(s) {
        if (root.console) {
            if (root.console.error) root.console.error(s);
            else if (root.console.log) root.console.log('Error: ' + s);
        }
    }

    function isArray(a) {
        return Object.prototype.toString.call(a) == '[object Array]';
    }

    function isFunction(f) {
        return Object.prototype.toString.call(f) == '[object Function]';
    }

    // Primary functionality

    /**
     * Checks if dependencies list is satisfiable
     *  and returns required dependencies in array on success
     *
     * @param deps string[] Dependencies list
     * @returns bool|Array Required dependencies or false if not satisfiable
     */
    function checkDependencies(deps) {
        var ret = [];
        for (var i = 0; i < deps.length; i++) {
            var dep = deps[i];
            if (modules.hasOwnProperty(dep) && modules[dep].resolved) {
                ret.push(modules[dep].value);
            } else {
                return false;
            }
        }
        return ret;
    }

    /**
     * Adds waiting callback for required dependencies
     *
     * @param deps string[] Dependencies list
     * @param callback Function to call when dependencies are resolved. Dependencies are passed as arguments
     */
    function addCallback(deps, callback) {
        callbacks.push({
            deps: isArray(deps) ? deps : [deps],
            callback: callback,
            waiting: true
        });
    }

    /**
     * Declares a new dependency
     *
     * @param name Dependency name
     * @param deps Dependencies list
     * @param def  Definition
     * @param callback Function
     */
    function declareModule(name, deps, def, callback) {
        modules[name] = {
            resolved: false,
            name: name,
            deps: deps,
            value: def,
            callback: callback
        };
        if (typeof deps === 'undefined') {
            markAsResolved(name, []);
        } else {
            addCallback(deps, function (/* dep1, dep2, ... */) {
                markAsResolved(name, arguments);
            });
        }
    }

    /**
     * Resolves dependency
     * Marks dependency as resolved
     * Invokes callback and stores it return value as dependency definition
     *
     * @param name
     * @param deps
     */
    function markAsResolved(name, deps) {
        if (modules.hasOwnProperty(name)) {
            var module = modules[name];
            if (!module.resolved) {
                if (module.callback) {
                    module.value = module.callback.apply(root, deps);
                }
                module.resolved = true;
            }
        }
    }

    /**
     * Main dependencies checking routine
     * Is called on every state change to try to resolve dependencies
     */
    function tick() {
        var resolved = 0;

        for (var i = 0; i < callbacks.length; i++) {
            if (callbacks[i].waiting) {
                var deps = checkDependencies(callbacks[i].deps);
                if (deps) {
                    log('resolved: ' + callbacks[i].deps.join(','));
                    resolved++;
                    callbacks[i].waiting = false;
                    callbacks[i].callback.apply(root, deps);
                }
            }
        }

        if (resolved) {
            setTimeout(tick, 0); // release thread
        } else {
            log('waiting: ' + esquire.waiting());
        }
    }

    var esquire = {
        /**
         * Adds callback that will be invoked only when all dependencies are resolved
         * Dependencies are passed to callback as arguments
         * @param deps string[] Dependencies list
         * @param callback Function
         */
        require: function (deps, callback) {
            log('required: ' + deps.join(','));
            addCallback(deps, callback);
            tick();
        },

        /**
         * Enables debug mode: verbose console messages are output
         * @param toggle
         */
        debug: function (toggle) {
            isDebug = toggle;
        },

        /**
         * Defines a new module (dependency)
         *
         * @param name string Module name
         * @param deps string[] OPTIONAL Dependencies list
         * @param def Function|{*} Module definition (Function will be invoked, plain value directly stored)
         */
        define: function (name, deps, def) {
            if (arguments.length <= 2) // independent define(name, def), events define(event_name)
            {
                def = deps;
                declareModule(name, [], def);
            } else {
                var callback = isFunction(def) ? def : null;
                var definition = isFunction(def) ? null : def;
                declareModule(name, deps, definition, callback);
            }
            tick();
        },

        /**
         * Used as error handler for attached <script> tags
         * @param name Module name
         */
        errorHandler: function (name) {
            log_error('Error loading module: ' + name);
        },

        /**
         * Attaches external script to <head> and invokes callback when it loads
         *
         * @param url string
         * @param callback Function
         */
        include: function (url, callback) {
            var e = document.createElement('script');
            e.src = url;
            e.type = 'text/javascript';
            e.async = true;
            if (callback) {
                e.onload = callback;
            }
            e.onError = function () {
                log_error('Error loading script: ' + url)
            };

            document.head.appendChild(e);
        },

        /**
         * Returns waiting dependencies names (for debugging)
         * @returns Array string[]
         */
        waiting: function () {
            var waiting = [];
            for (var i = 0; i < callbacks.length; i++) {
                if (callbacks[i].waiting) {
                    for (var k = 0; k < callbacks[i].deps.length; k++) {
                        var module = callbacks[i].deps[k];
                        if (!modules.hasOwnProperty(module) || !modules[module].resolved)
                            waiting.push(module);
                    }
                }
            }
            return waiting;
        }
    };

    // expose "esquire" and "esquire.include" as modules
    esquire.define('esquire', esquire);
    esquire.define('include', esquire.include);

    root.esquire = esquire;
    root.require = esquire.require;
    root.define = esquire.define;
})(window);
