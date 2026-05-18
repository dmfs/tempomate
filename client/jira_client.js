import GLib from 'gi://GLib';
import { RestClient } from './rest_client.js';
import { TempoServerClient } from './tempo_server_client.js';
import { TempoCloudClient } from './tempo_cloud_client.js';

function normalizePickerResponse(response) {
    return (response.sections ?? [])
        .flatMap(section => section.issues ?? [])
        .map(issue => ({ id: issue.id, key: issue.key, fields: { summary: issue.summaryText } }));
}

function jira_client_from_config(settings) {
    const deploymentType = settings.get_string("deployment-type");
    console.log(`tempomate: deployment-type = ${deploymentType}`);
    switch (deploymentType) {
        case "jira-server":
            const host = settings.get_string("host");
            console.log(`tempomate: jira-server host = ${host}`);
            return new JiraServerClient(
                new RestClient(host),
                settings.get_string("username"),
                settings.get_string("token")
            );
        case "jira-cloud":
            const cloudHost = settings.get_string("jira-cloud-host");
            console.log(`tempomate: jira-cloud host = ${cloudHost}`);
            return new JiraCloudClient(
                new RestClient(cloudHost),
                settings.get_string("jira-cloud-username"),
                settings.get_string("jira-cloud-token"),
                settings.get_string("tempo-cloud-token"));
        default:
            console.error(`tempomate: Unknown deployment-type: ${deploymentType}`);
            return null;
    }
}

class JiraServerClient {
    constructor(rest_client, username, token) {
        this.rest_client = rest_client;
        this.username = username;
        this.token = token;
    }

    issue(issue, response_handler, error_handler) {
        console.log(`tempomate: Fetching issue ${issue}`);
        this.rest_client.get(`/rest/api/3/issue/${encodeURI(issue)}?fields=id,key,summary`,
            [["Authorization", `Bearer ${this.token}`]])
            .then(response_handler)
            .catch(e => {
                console.error(`tempomate: Failed to fetch issue ${issue}:`, e.message);
                error_handler?.(e);
            });
    }

    filter(jql, response_handler, error_handler) {
        this.rest_client.get(
            `/rest/api/3/search?jql=${encodeURI(jql)}&maxResults=30&fields=id,key,summary`,
            [["Authorization", `Bearer ${this.token}`]])
            .then(response_handler)
            .catch(error_handler);
    }

    search(query, response_handler, error_handler) {
        this.rest_client.get(
            `/rest/api/3/issue/picker?query=${encodeURI(query)}&showSubTasks=true`,
            [["Authorization", `Bearer ${this.token}`]])
            .then(response => response_handler(normalizePickerResponse(response)))
            .catch(error_handler);
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
        console.log(`tempomate: Fetching issue ${issue} (cloud)`);
        this.rest_client.get(`/rest/api/3/issue/${encodeURI(issue)}?fields=id,key,summary`,
            [["Authorization", `Basic ${this._base64(this.username, this.token)}`]])
            .then(response_handler)
            .catch(e => {
                console.error(`tempomate: Failed to fetch issue ${issue} (cloud):`, e.message);
                error_handler?.(e);
            });
    }

    filter(jql, response_handler, error_handler) {
        this.rest_client.post(
            `/rest/api/3/search/jql`,
            [["Authorization", `Basic ${this._base64(this.username, this.token)}`]],
            { jql: jql, maxResults: 30, fields: ["id", "key", "summary"] })
            .then(response_handler)
            .catch(error_handler);
    }

    search(query, response_handler, error_handler) {
        this.rest_client.get(
            `/rest/api/3/issue/picker?query=${encodeURI(query)}&showSubTasks=true`,
            [["Authorization", `Basic ${this._base64(this.username, this.token)}`]])
            .then(response => response_handler(normalizePickerResponse(response)))
            .catch(error_handler);
    }

    async tempo() {
        if (this._tempo) {
            return this._tempo;
        }
        const account_info = await this.rest_client.get(
            "/rest/api/3/myself",
            [["Authorization", `Basic ${this._base64(this.username, this.token)}`]]);
        this._tempo = new TempoCloudClient(new RestClient("https://api.tempo.io"), account_info.accountId, this.tempo_token);
        return this._tempo;
    }

    _base64(username, password) {
        return GLib.base64_encode(new TextEncoder().encode(`${username}:${password}`));
    }
}

export { jira_client_from_config }
