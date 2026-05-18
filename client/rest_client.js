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
        const url = this.base_url + path;
        let message = Soup.Message.new(method, url);
        if (!message) {
            console.error(`tempomate: Failed to create message for ${method} ${url}`);
            return Promise.reject(new Error(`Invalid URL: ${url}`));
        }
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
                        console.error(`tempomate: ${method} ${this.base_url}${path} failed with status ${message.status_code}`);
                        debug(`Response ${new TextDecoder().decode(bytes.get_data())}`)
                        const error = new Error(`Received response status code ${message.status_code}`);
                        error.status_code = message.status_code;
                        reject(error)
                    }
                } catch (e) {
                    console.error(`tempomate: ${method} ${this.base_url}${path} error:`, e.message);
                    reject(e);
                }
            }));
    }
}

export { RestClient }
