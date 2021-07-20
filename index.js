let app = new Vue({
    el: '#app',
    data() {
        return {
            show: {
                container: 'requestBox',
                response: false,
            },
            form: {
                url: 'static.moodrain.cn/1',
                method: 'GET',
                contentType: 'application/json',
                bodyInputType: 'input',
                bodyText: '',
                bodyInputs: [{
                    name: '',
                    value: ''
                }],
                headerInputs: [{
                    name: '',
                    value: ''
                }],
                cookieInputs: [{
                    name: '',
                    value: ''
                }],
            },
            response: {
                header: [],
                cookie: [],
                body: '',
            },
            activeResponseTab: 'body',
            history: [],
            saved: [],
            toImport: null,
            sendingReq: false,
            recordOpen: {
                history: [],
                saved: [],
            },
        }
    },
    methods: {
        submit() {
            if (!this.form.url) {
                this.$notify.warning('Empty URL')
                return
            }
            this.send(this.form2Request())
        },
        form2Request() {
            let method = this.form.method
            let request = {}
            request.url = this.form.url
            request.method = this.form.method
            request.contentType = (method == 'POST' || method == 'PUT' || method == 'PATCH') ? this.form.contentType : ''
            if (this.form.bodyInputType == 'input') {
                request.body = {}
                this.form.bodyInputs.filter(p => p.name != '').forEach(p => {
                    request.body[p.name] = p.value
                })
            } else {
                request.body = this.form.bodyText
            }
            request.cookie = {}
            this.form.cookieInputs.filter(p => p.name != '').forEach(p => {
                request.cookie[p.name] = p.value
            })
            request.header = {}
            this.form.headerInputs.filter(p => p.name != '').forEach(p => {
                request.header[p.name] = p.value
            })
            return request
        },
        send(request) {
            this.sendingReq = true
            fetch('api.php', {
                body: JSON.stringify(request),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(rs => {
                rs.json().then(json => {
                    this.response.body = json.body
                    this.response.header = json.header
                    this.response.cookie = json.cookie
                    this.$notify.success('Request Compelete')
                    this.fillResponse(json)
                    let d = new Date()
                    let record = {
                        id: d.getTime() + '' + parseInt(Math.random()),
                        time: d.getMonth().toString().padStart(2, 0) + '-' + d.getDate().toString().padStart(2, 0) + ' ' + d.getHours().toString().padStart(2, 0) + ':' + d.getMinutes().toString().padStart(2, 0)
                    }
                    let historyCache = localStorage.getItem('history')
                    let recordList = historyCache ? JSON.parse(historyCache) : []
                    recordList.unshift(Object.assign(record, request, {
                        response: json
                    }))
                    localStorage.setItem('history', JSON.stringify(recordList))
                }).catch(e => {
                    this.$notify.error('Request Fail')
                })
            }).catch(e => {
                this.$notify.error('Request Fail')
            })
            this.sendingReq = false
        },
        fillResponse(response) {
            let isJson = response.header['Content-Type'] ? (response.header['Content-Type'].indexOf('application/json') !== -1) : false
            let showRsBody = isJson ? JSON.stringify(response.body, '', 2) : response.body
            let showRsHeader = JSON.stringify(response.header, '', 2)
            let showRsCookie = JSON.stringify(response.cookie, '', 2)
            let fillRs = (id, content, isJson) => {
                let code = document.createElement('code')
                code.className = isJson ? 'lang-json' : 'lang-html'
                code.innerHTML = content.replace(/[<>&"]/g, function(c) {
                    return {
                        '<': '&lt;',
                        '>': '&gt;',
                        '&': '&amp;',
                        '"': '&quot;'
                    }[c]
                })
                let pre = document.createElement('pre')
                pre.appendChild(code)
                let e = document.querySelector('#' + id)
                e.innerHTML = ''
                e.appendChild(pre)
            }
            fillRs('rs-show-body', showRsBody, isJson)
            fillRs('rs-show-header', showRsHeader, true)
            fillRs('rs-show-cookie', showRsCookie, true)
            hljs.highlightAll()
            this.show.response = true
        },
        addFieldInput(field, index, name) {
            let hasEmpty = this.form[field].find(p => !p.name && !p.value)
            if (!hasEmpty) {
                this.form[field].push({
                    name: '',
                    value: '',
                })
            }
        },
        genExport() {
            let request = this.form2Request()
            return JSON.stringify(request, '', 2)
        },
        doImport() {
            try {
                let record = JSON.parse(this.toImport.trim())
                this.realImport(record)
                this.$notify.success('Import Success')
                this.show.container = 'requestBox'
                this.toImport = ''
            } catch (e) {
                this.$notify.error('Import Input is not JSON')
            }
        },
        realImport(record) {
            this.form.url = record.url
            this.form.method = record.method
            if (record.contentType) {
                this.form.contentType = record.contentType
            }
            this.fillBodyFromStrOrObj(record.body)
            let fillInput = (field, obj) => {
                this[field] = []
                for (let name in obj) {
                    this[field].push({
                        name,
                        value: obj[name]
                    })
                }
            }
            fillInput('cookieInputs', record.cookie)
            fillInput('headerInputs', record.header)
            if (record.response) {
                this.response.header = record.response.header
                this.response.cookie = record.response.cookie
                this.response.body = record.response.body
            }
            if (record.response) {
                this.fillResponse(record.response)
            }
        },
        bodyInputTypeChange(type) {
            let obj = {}
            if (type == 'text') {
                this.form.bodyInputs.filter(p => p.name).forEach(p => {
                    obj[p.name] = p.value
                })
                this.form.bodyText = JSON.stringify(obj, '', 2)
            } else if (type == 'input') {
                this.fillBodyFromStrOrObj(this.form.bodyText)
            }
        },
        fillBodyFromStrOrObj(str) {
            let obj
            if (typeof str == 'object') {
                obj = str
            } else {
                if (str.substr(0, 1) == '{') {
                    try {
                        obj = JSON.parse(str)
                    } catch (e) {
                        this.$notify.error('Body Text is not JSON')
                    }
                } else {
                    this.form.bodyInputs = []
                    let arr = str.split('&')
                    arr.forEach(pair => {
                        let kv = pair.split('=')
                        obj[kv[0]] = kv[1]
                    })
                }
            }
            this.form.bodyInputs = []
            for (let name in obj) {
                this.form.bodyInputs.push({
                    name,
                    value: obj[name]
                })
            }
        },
        toHistory() {
            this.show.response = false
            this.show.container = 'history'
            historyCache = localStorage.getItem('history')
            if (!historyCache) {
                this.history = []
            } else {
                historyList = JSON.parse(historyCache)
                this.history = historyList
            }
            this.$nextTick(() => { hljs.highlightAll() })
        },
        toSaved() {
            this.show.response = false
            this.show.container = 'saved'
            savedCache = localStorage.getItem('saved')
            if (!savedCache) {
                this.saved = []
            } else {
                savedList = JSON.parse(savedCache)
                this.saved = savedList
            }
            this.$nextTick(() => { hljs.highlightAll() })
        },
        doSave() {
            let d = new Date()
            let base = {
                id: d.getTime() + '' + parseInt(Math.random()),
                time: d.getMonth().toString().padStart(2, 0) + '-' + d.getDate().toString().padStart(2, 0) + ' ' + d.getHours().toString().padStart(2, 0) + ':' + d.getMinutes().toString().padStart(2, 0)
            }
            let request = this.form2Request()
            let record = Object.assign(base, request, {
                response: {
                    body: this.response.body,
                    header: this.response.header,
                    cookie: this.response.cookie,
                }
            })
            record.name = record.time
            let savedCache = localStorage.getItem('saved')
            let recordList = savedCache ? JSON.parse(savedCache) : []
            recordList.unshift(record)
            localStorage.setItem('saved', JSON.stringify(recordList))
            this.$notify.success('Save Compelete')
        },
        rmRecord(from, index) {
            let list = JSON.parse(localStorage.getItem(from))
            list.splice(index, 1)
            this.recordOpen[from][index] = []
            from == 'history' ? this.history = list : this.saved = list
            localStorage.setItem(from, JSON.stringify(list))
        },
        renameSaved(index) {
            this.$prompt().then(({ value }) => {
                this.saved[index].name = value
                localStorage.setItem('saved', JSON.stringify(this.saved))
                this.$notify.success('Rename Compelete')
            }).catch(() => {})
        },
        moveSaved(index, addIndex) {
            if ((index == 0 && addIndex < 0) || (index == this.saved.length - 1 && addIndex > 0)) {
                return
            }
            let e = this.saved[index]
            this.saved.splice(index, 1)
            this.saved.splice(index + addIndex, 0, e)
        },
        importRecord(record) {
            this.realImport(record)
            this.$notify.success('Import Success')
            this.show.container = 'requestBox'
        },
        showResponse(record) {
            this.fillResponse(record.response)
        },
        backToolBox() {
            this.show.container = 'toolBox'
            this.show.response = false
        }
    }
})