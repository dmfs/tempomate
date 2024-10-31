import GLib from 'gi://GLib';
import { RestClient } from './rest_client.js';
import { TempoServerClient } from './tempo_server_client.js';
import { TempoCloudClient } from './tempo_cloud_client.js';

function jira_client_from_config(settings) {
    switch (settings.get_string("deployment-type")) {
        case "jira-server":
            return new JiraServerClient(
                new RestClient(settings.get_string("host")),
                settings.get_string("username"),
                settings.get_string("token")
            );
        case "jira-cloud":
            return new JiraCloudClient(
                new RestClient(settings.get_string("jira-cloud-host")),
                settings.get_string("jira-cloud-username"),
                settings.get_string("jira-cloud-token"),
                settings.get_string("tempo-cloud-token"));
    }
}

class JiraServerClient {
    constructor(rest_client, username, token) {
        this.rest_client = rest_client;
        this.username = username;
        this.token = token;
    }

    issue(issue, response_handler, error_handler) {
        this.rest_client.get(`/rest/api/2/issue/${encodeURI(issue)}?fields=id,key,summary`,
            [["Authorization", `Bearer ${this.token}`]],
            response_handler,
            error_handler);
    }

    filter(jql, response_handler, error_handler) {
        this.rest_client.get(
            `/rest/api/2/search?jql=${encodeURI(jql)}&maxResults=30&fields=id,key,summary`,
            [["Authorization", `Bearer ${this.token}`]],
            response_handler,
            error_handler);
    }

    async tempo() {
        return Promise.resolve(new TempoServerClient(this.rest_client, this.username, this.token));
    }
}

class JiraCloudClient {
    constructor(rest_client, username, token, tempo_token) {
        this.rest_client = rest_client;
        this.username = username;
        this.token = token;
        this.tempo_token = tempo_token;
    }

    issue(issue, response_handler, error_handler) {
        // TODO: use API V3
        this.rest_client.get(`/rest/api/2/issue/${encodeURI(issue)}?fields=id,key,summary`,
            [["Authorization", `Basic ${this._base64(this.username, this.token)}`]],
            response_handler,
            error_handler);
    }

    filter(jql, response_handler, error_handler) {
        // TODO: use API V3
        this.rest_client.get(
            `/rest/api/2/search?jql=${encodeURI(jql)}&maxResults=30&fields=id,key,summary`,
            [["Authorization", `Basic ${this._base64(this.username, this.token)}`]],
            response_handler,
            error_handler);
    }

    async tempo() {
        return new Promise((resolve, reject) =>
            this.rest_client.get("/rest/api/3/myself",
                [["Authorization", `Basic ${this._base64(this.username, this.token)}`]],
                result => resolve?.(new TempoCloudClient(new RestClient("https://api.tempo.io"), result.accountId, this.tempo_token)),
                error => reject(error))
        );
    }

    _base64(username, password) {
        return GLib.base64_encode(new TextEncoder().encode(`${username}:${password}`));
    }
}

export { jira_client_from_config }
