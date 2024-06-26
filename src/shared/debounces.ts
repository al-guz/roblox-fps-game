export function isActive(booleanValue: BoolValue) : boolean {
    return booleanValue.Value
}

export function activate(booleanValue: BoolValue, duration: number) {
    let t = duration
    new Promise((resolve, reject, onCancel) => {
        booleanValue.Value = true
        while (t > 0) {
            t -= .01
            task.wait(.01)
        }
        booleanValue.Value = false
        resolve(undefined)
    })
}

export function findBoolValue(instanceToFind: Instance, name: string) : BoolValue | undefined {
    const descendants = instanceToFind.GetDescendants()
    name = name.lower()
    let results : undefined | BoolValue = undefined
    Promise.each(descendants, (instance) => {
        if (instance.IsA("BoolValue")) {
            if (instance.Name.lower() === name) {
                results = instance
            }
        }
    }).await()
    return results
}