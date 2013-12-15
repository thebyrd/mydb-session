# mydb-session
mydb session store

## how to use
```javascript
var session = require('mydb-session')
app.use(session({
  url: 'uid.mydb.io',
  mongo: require('monk')(),
  secret: 'supersecuresecret'
}))
```

```javascript


```

