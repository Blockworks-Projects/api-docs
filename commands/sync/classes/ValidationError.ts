export class ValidationError {
  type: string
  message: string
  endpoint: string

  constructor(config: ValidationError) {
    this.type = config.type
    this.message = config.message
    this.endpoint = config.endpoint
  }
}