// A real (decodable) 1x1 transparent PNG, needed for upload flows that decode
// the file client-side (e.g. the avatar cropper draws it onto a canvas)
// rather than just forwarding raw bytes to the backend's disk storage.
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export const TEST_PNG_BUFFER = Buffer.from(TEST_PNG_BASE64, 'base64');
