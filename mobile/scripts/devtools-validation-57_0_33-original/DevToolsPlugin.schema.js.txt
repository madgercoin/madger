"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get DevToolsPluginOutputSchema () {
        return DevToolsPluginOutputSchema;
    },
    get PluginSchema () {
        return PluginSchema;
    }
});
const CommandParameterSchema = {
    type: 'object',
    required: [
        'name',
        'type'
    ],
    properties: {
        name: {
            type: 'string',
            minLength: 1
        },
        type: {
            enum: [
                'text',
                'number',
                'confirm'
            ]
        },
        description: {
            type: 'string'
        }
    }
};
const CommandSchema = {
    type: 'object',
    required: [
        'name',
        'title',
        'environments'
    ],
    properties: {
        name: {
            type: 'string',
            minLength: 1
        },
        title: {
            type: 'string',
            minLength: 1
        },
        environments: {
            type: 'array',
            items: {
                enum: [
                    'cli',
                    'mcp'
                ]
            }
        },
        parameters: {
            type: 'array',
            items: CommandParameterSchema
        }
    }
};
const CliExtensionsSchema = {
    type: 'object',
    required: [
        'description',
        'commands',
        'entryPoint'
    ],
    properties: {
        description: {
            type: 'string'
        },
        commands: {
            type: 'array',
            items: CommandSchema,
            minItems: 1
        },
        entryPoint: {
            type: 'string',
            minLength: 1
        }
    }
};
const PluginSchema = {
    type: 'object',
    required: [
        'packageName',
        'packageRoot'
    ],
    properties: {
        packageName: {
            type: 'string',
            minLength: 1
        },
        packageRoot: {
            type: 'string',
            minLength: 1
        },
        webpageRoot: {
            type: 'string'
        },
        bannerTitle: {
            type: [
                'boolean',
                'string'
            ],
            minLength: 1
        },
        serverEntryPoint: {
            type: 'string'
        },
        cliExtensions: CliExtensionsSchema
    }
};
const DevToolsPluginOutputSchema = {
    type: 'array',
    items: {
        type: 'object',
        allOf: [
            {
                required: [
                    'type'
                ],
                properties: {
                    type: {
                        enum: [
                            'text',
                            'audio',
                            'image'
                        ]
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {
                            enum: [
                                'text'
                            ]
                        }
                    }
                },
                then: {
                    required: [
                        'text',
                        'level'
                    ],
                    properties: {
                        text: {
                            type: 'string'
                        },
                        url: {
                            type: 'string'
                        },
                        level: {
                            enum: [
                                'info',
                                'warning',
                                'error'
                            ]
                        }
                    }
                },
                else: {
                    required: [
                        'url'
                    ],
                    properties: {
                        url: {
                            type: 'string',
                            format: 'url'
                        },
                        text: {
                            type: 'string'
                        }
                    }
                }
            }
        ]
    }
};

//# sourceMappingURL=DevToolsPlugin.schema.js.map