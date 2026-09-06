const mongoose = require('mongoose');

const uri = 'mongodb://ishanvaidya01_db_user:UWrJGqDuxr3YgSQE@ac-yxxvtzb-shard-00-00.azhrngp.mongodb.net:27017,ac-yxxvtzb-shard-00-01.azhrngp.mongodb.net:27017,ac-yxxvtzb-shard-00-02.azhrngp.mongodb.net:27017/shelf2cash?ssl=true&authSource=admin&retryWrites=true&w=majority';

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('SUCCESS');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  });
