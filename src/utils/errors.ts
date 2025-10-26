export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const NotFound = (m = "Not Found") => new HttpError(404, m);
export const BadRequest = (m = "Bad Request") => new HttpError(400, m);
export const Forbidden = (m = "Forbidden") => new HttpError(403, m);
