/**
 * Conversation feature compatibility entrypoint.
 *
 * Runtime code should import ./runtime. Lazy UI loaders should import ./ui.
 * Character registry and authoring helpers live behind ./authoring so importing
 * this module no longer initializes character authoring code.
 */

export * from './runtime'
export * from './ui'
