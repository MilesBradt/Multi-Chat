export class GetAPI {
    callAPI(url) {
        return new Promise(function (resolve, reject) {
            let request = new XMLHttpRequest();
            request.onload = function () {
                if (this.status === 200) {
                    resolve(request.response);
                } else {
                    reject(Error(request.statusText));
                }
            }
            request.open("GET", url, true);
            request.send();
        });
    }
}