import Soup from 'gi://Soup';
import { debug } from '../utils/log.js';

class RestClient {
    constructor(base_url) {
        this.httpSession = new Soup.Session();
        this.base_url = base_url;
    }

    get(path, headers, response_handler, error_handler = (e) => debug(`Could not parse response body ${e}`)) {
        this._request("GET", path, headers, null, response_handler, error_handler)
    }

    put(path, headers, payload, response_handler, error_handler = (e) => debug(`Could not parse response body ${e}`)) {
        this._request("PUT", path, headers, payload, response_handler, error_handler)
    }

    post(path, headers, payload, response_handler, error_handler = (e) => debug(`Could not parse response body ${e}`)) {
        this._request("POST", path, headers, payload, response_handler, error_handler)
    }

    _request(method, path, headers, payload, response_handler, error_handler = (e) => debug(`Could not parse response body ${e}`)) {
        let message = Soup.Message.new(method, this.base_url + path);
        headers?.forEach(element => message.request_headers.append(element[0], element[1]));

        if (payload) {
            let utf8Encode = new TextEncoder();
            message.set_request_body_from_bytes("application/json", utf8Encode.encode(JSON.stringify(payload)));
            debug(`${method} payload ${JSON.stringify(payload)}`)
        }

        this.httpSession.send_and_read_async(message, 0, null,
            (source, response_message) => {
                try {
                    if (message.status_code >= 200 && message.status_code < 300) {
                        const bytes = this.httpSession.send_and_read_finish(response_message);
                        const decoder = new TextDecoder();

                        response_handler(JSON.parse(decoder.decode(bytes.get_data())));
                    } else {
                        const bytes = this.httpSession.send_and_read_finish(response_message);
                        debug(`Response ${new TextDecoder().decode(bytes.get_data())}`)
                        error_handler(`Received response status code ${message.status_code}`)
                    }
                } catch (e) {
                    error_handler(e);
                }
            });
    }
}

export { RestClient }
