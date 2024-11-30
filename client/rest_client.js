import Soup from 'gi://Soup';
import { debug } from '../utils/log.js';

class RestClient {
    constructor(base_url) {
        this.httpSession = new Soup.Session();
        this.base_url = base_url;
    }

    async get(path, headers) {
        return await this._request("GET", path, headers);
    }

    async put(path, headers, payload) {
        return await this._request("PUT", path, headers, payload);
    }

    async post(path, headers, payload) {
        return await this._request("POST", path, headers, payload);
    }

    async _request(method, path, headers, payload) {
        let message = Soup.Message.new(method, this.base_url + path);
        headers?.forEach(element => message.request_headers.append(element[0], element[1]));

        if (payload) {
            let utf8Encode = new TextEncoder();
            message.set_request_body_from_bytes("application/json", utf8Encode.encode(JSON.stringify(payload)));
            debug(`${method} payload ${JSON.stringify(payload)}`)
        }

        return new Promise((resolve, reject) => this.httpSession.send_and_read_async(message, 0, null,
            (source, response_message) => {
                try {
                    if (message.status_code >= 200 && message.status_code < 300) {
                        const bytes = this.httpSession.send_and_read_finish(response_message);
                        const decoder = new TextDecoder();

                        resolve(JSON.parse(decoder.decode(bytes.get_data())));
                    } else {
                        const bytes = this.httpSession.send_and_read_finish(response_message);
                        debug(`Response ${new TextDecoder().decode(bytes.get_data())}`)
                        reject(new Error(`Received response status code ${message.status_code}`))
                    }
                } catch (e) {
                    reject(e);
                }
            }));
    }
}

export { RestClient }
