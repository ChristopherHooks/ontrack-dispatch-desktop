/**
 * All IPC channel names used between Renderer → Preload → Main
 * 
 * Defining them in one place prevents mismatched channel names
 * and keeps Electron communication type-safe.
 */

export const IPC_CHANNELS = {
    APP_INFO: "app:getInfo",

    DRIVER: {
        CREATE: "driver:create",
        GET_ALL: "driver:getAll",
        UPDATE: "driver:update",
        DELETE: "driver:delete"
    },

    LOAD: {
        CREATE: "load:create",
        GET_ALL: "load:getAll",
        UPDATE: "load:update",
        DELETE: "load:delete"
    },

    LEAD: {
        CREATE: "lead:create",
        GET_ALL: "lead:getAll",
        UPDATE: "lead:update",
        DELETE: "lead:delete"
    },

    TASK: {
        CREATE: "task:create",
        GET_ALL: "task:getAll",
        UPDATE: "task:update",
        DELETE: "task:delete"
    },

    SETTINGS: {
        GET: "settings:get",
        UPDATE: "settings:update"
    }

} as const

export type IPCChannel =
    | typeof IPC_CHANNELS.APP_INFO
    | typeof IPC_CHANNELS.DRIVER[keyof typeof IPC_CHANNELS.DRIVER]
    | typeof IPC_CHANNELS.LOAD[keyof typeof IPC_CHANNELS.LOAD]
    | typeof IPC_CHANNELS.LEAD[keyof typeof IPC_CHANNELS.LEAD]
    | typeof IPC_CHANNELS.TASK[keyof typeof IPC_CHANNELS.TASK]
    | typeof IPC_CHANNELS.SETTINGS[keyof typeof IPC_CHANNELS.SETTINGS]