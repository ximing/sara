import { isObservableArray } from "../types/observablearray"
import { isObservableMap } from "../types/observablemap"
import { isObservableObject, ObservableObjectAdministration } from "../types/observableobject"
import { isAtom } from "../core/atom"
import { isComputedValue } from "../core/computedvalue"
import { isReaction } from "../core/reaction"
import { fail } from "../utils/utils"

function _isObservable(value, property?: string): boolean {
    if (value === null || value === undefined) return false
    if (property !== undefined) {
        if (
            process.env.NODE_ENV !== "production" &&
            (isObservableMap(value) || isObservableArray(value))
        )
            return fail(
                "isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead."
            )
        if (isObservableObject(value)) {
            const o = <ObservableObjectAdministration>(value as any).$mobx
            return o.values && !!o.values[property]
        }
        return false
    }
    // For first check, see #701
    return (
        isObservableObject(value) ||
        !!value.$mobx ||
        isAtom(value) ||
        isReaction(value) ||
        isComputedValue(value)
    )
}

export function isObservable(value: any): boolean {
    if (arguments.length !== 1)
        fail(
            process.env.NODE_ENV !== "production" &&
                `isObservable expects only 1 argument. Use isObservableProp to inspect the observability of a property`
        )
    return _isObservable(value)
}

export function isObservableProp(value: any, propName: string): boolean {
    if (typeof propName !== "string")
        return fail(
            process.env.NODE_ENV !== "production" && `expected a property name as second argument`
        )
    return _isObservable(value, propName)
}
