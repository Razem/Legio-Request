# Legio-Request

A library for an easy work with AJAX requests.

**Installation:**
```
npm install legio-request
```

**Compatible with:**
- Node.js
- Browserify

**Modules:**
- legio-request
  - xhr

**TODO:**
-

## legio/util/request
```javascript
Request
  file(file, cfg) -> Promise | String // A string is returned in case of a sync request
  script(file) -> Promise // Just in a web browser

[cfg]
  async: Boolean
  callback: Function
  get: String
  post: String
```

## legio/util/xhr
```javascript
XMLHttpRequest
```
