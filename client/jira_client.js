const Lang = imports.lang;
const Soup = imports.gi.Soup;

var JiraApi2Client = class JiraApi2Client {
    constructor(base_url, token) {
        this.httpSession = new Soup.Session();
        this.base_url = base_url;
        this.token = token;
    }

    issue(issue, response_handler, error_handler) {
        this.get('/rest/api/2/issue/' + encodeURI(issue) + '?fields=id,key,summary', response_handler, error_handler);
    }

    filter(jql, response_handler, error_handler) {
        this.get(
            '/rest/api/2/search?jql=' + encodeURI(jql) + '&maxResults=30&fields=id,key,summary',
            response_handler,
            error_handler);
    }

    get(path, response_handler, error_handler = (e) => log(`Could not parse response body ${e}`)) {
        this._request("GET", path, null, response_handler, error_handler)
    }

    put(path, payload, response_handler, error_handler = (e) => log(`Could not parse response body ${e}`)) {
        this._request("PUT", path, payload, response_handler, error_handler)
    }

    post(path, payload, response_handler, error_handler = (e) => log(`Could not parse response body ${e}`)) {
        this._request("POST", path, payload, response_handler, error_handler)
    }

    _request(method, path, payload, response_handler, error_handler = (e) => log(`Could not parse response body ${e}`)) {
        let message = Soup.Message.new(method, this.base_url + path);
        message.request_headers.append("Authorization", "Bearer " + this.token);

        if (payload) {
            let utf8Encode = new TextEncoder();
            message.set_request_body_from_bytes("application/json", utf8Encode.encode(JSON.stringify(payload)));
            log(method + " payload " + JSON.stringify(payload))
        }

        this.httpSession.send_and_read_async(message, 0, null, Lang.bind(this,
            (source, response_message) => {
                try {
                    const bytes = this.httpSession.send_and_read_finish(response_message);
                    const decoder = new TextDecoder();
                    response_handler(JSON.parse(decoder.decode(bytes.get_data())));
                } catch (e) {
                    error_handler(e);
                }
            }));
    }
}
