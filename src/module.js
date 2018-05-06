/**
 * Created by ximing on 2018/5/6.
 */
"use strict";
import cloneDeep from "lodash.clonedeep";
import trim from "lodash.trim";
import { isObject } from "./util";
import invariant from "invariant";
import { action, observable } from "./libs/mobx";

export default class Module {
    constructor(namespace, module, runtime) {
        let { state, actions, mutations, getters, modules, namespaced } = cloneDeep({
            actions: {},
            state: {},
            getters: {},
            mutations: {},
            namespaced: false,
            modules: {},
            ...module
        });
        invariant(isObject(actions), "actions should be object");
        invariant(isObject(getters), "getters should be object");
        invariant(isObject(mutations), "mutations should be object");
        this.modules = modules;
        this.state = observable(state);
        this.namespaced = namespaced;
        this.prefix = "";
        this.namespace = namespace;
        this.runtime = runtime;
        let key = namespace,
            _saraState = runtime.state;
        trim(namespace, "/")
            .split("/")
            .slice(0, -1)
            .forEach(_key => {
                this.prefix += `${_key}/`;
                _saraState = _saraState[_key];
                key = _key;
            });
        _saraState[key] = this.state;
        for (let [key, fn] of Object.entries(actions)) {
            this["actions"][key] = action(`${namespace}/${key}`, fn.bind(this));
        }
        for (let [key, fn] of Object.entries(getters)) {
            this["getters"][key] = action(`${namespace}/${key}`, fn.bind(this));
        }
        for (let [key, fn] of Object.entries(mutations)) {
            this["mutations"][key] = action(`${namespace}/${key}`, fn.bind(this));
        }

        if (module.namespaced && module.modules) {
            runtime.registerModules(`${namespace === "/" ? "" : "/"}`, module.modules);
        }
    }

    _baseModuleCall = (scope, args, type, payload = {}, options = { root: false }) => {
        if (isObject(type)) {
            payload = type;
            if (!type.type) {
                throw new Error("type is required");
            }
            type = type.type;
            options = Object.assign(options, payload);
        }
        if (!options.root) {
            type = `${this.prefix}${type}`;
        }
        let namespace = type.split("/");
        let fnName = namespace.pop();
        namespace = namespace.join("/");
        if (!this._modulesNamespaceMap[namespace]) {
            console.error(`not find ${namespace} module`);
            return;
        }
        if (this.runtime._modulesNamespaceMap[namespace][scope][fnName]) {
            console.error(`not find ${fnName}() in ${namespace}['${scope}']`);
            return;
        }
        return this.runtime._modulesNamespaceMap[namespace][scope][fnName](...args);
    };

    commit = (type = this.namespace, payload, options = { root: false }) => {
        return this._baseModuleCall("mutations", [payload], type, payload, options);
    };

    dispatch = (type = this.namespace, payload, options = { root: false }) => {
        return this._baseModuleCall(
            "mutations",
            [
                {
                    state: this.state,
                    rootState: this.runtime.state,
                    commit: (...args) => {
                        return this.runtime.commit(...args);
                    },
                    dispatch: (...args) => {
                        return this.runtime.dispatch(...args);
                    },
                    getters: this.getters,
                    rootGetters: this.runtime.rootGetters
                },
                payload
            ],
            type,
            payload,
            options
        );
    };
}
