//gets XRP & IOU balances for a set of accounts
//prints the balances for each account summed by currency
//prints the balances across all accounts summed by currency

var Promise = require('promise');
var _ = require('underscore');
/* Accounts to use for testing */
var accounts = ['rUB4uZESnjSp2r7Uw1PnKSPWNMkTDCMXDJ', 
	'rBTC1BgnrukYh9gfE8uL5dqnPCfZXUxiho', 
	'r4ffgYrACcB82bt99VnqH4B9GEntEypTcp'];

/* Loading ripple-lib with Node.js */
var Remote = require('ripple-lib').Remote;
var remote = new Remote({servers: ['wss://s1.ripple.com:443']});

remote.connect(function() {
  console.log('connected');
  getAccountsBalances(accounts);
});

//Creates a promise for each account, which is itself
//a grouping of two promises, one which fetches the 
//XRP balance via requestAccountInfo, and the other which fetches
//IOU balances (summarized by currency) via requestAccountLines
function getAccountsBalances(accounts) {
  var promises = _.map(accounts, function(account) {
    return getBalances(account);
  });//Using underscore map based on performance testing (see write-up)

  Promise.all(promises)
  .then(function(data) {
    console.log('Account balances:');
    console.log(data);
    console.log(calcSummaryBalances(data));
    process.exit(0);
  }, function(error) {
    console.log('error: ', e);
    process.exit(1);
  });
}

//returns a Promise representing the combined balances array
function getBalances(account) {
  return new Promise(function (fulfill, reject) {
    var promises = [];
    promises.push(getIOUBalances(account));
    promises.push(getXRPBalance(account));

    Promise.all(promises)
    .then(function(data) {
      balances = combineBalanceArrays(data[0], data[1]);
      var result = {
        'account': account,
        'balances': balances
      }
      fulfill(result);
    }, function(error) {
      reject;
    });
  });
}

//returns a Promise representing the XRP balance
function getIOUBalances(account) {
  return new Promise(function (fulfill, reject) {
    var request = remote.requestAccountLines({account: account});

    request.once('error', reject);

    request.once('success', function(response) {
      var balances = new Array();
      response.lines.forEach(function(line) {
        if (balances.hasOwnProperty(line.currency)) {
          balances[line.currency] += parseFloat(line.balance);
        }
        else {
          balances[line.currency] = parseFloat(line.balance);
        }
      });
      fulfill(balances);
    });

    request.request();
  });
}

//returns a Promise representing the IOU balances
function getXRPBalance(account) {
  return new Promise(function (fulfill, reject) {
    var request = remote.requestAccountInfo({account: account});

    request.once('error', reject);

    request.once('success', function(response) {
      fulfill({'XRP': response.account_data.Balance/1000000});
    });

    request.request();
  });
}

//utility function to combine two associative arrays
function combineBalanceArrays(destination, source) {
  for (attr in source) {
    if (destination.hasOwnProperty(attr)) {
      destination[attr] += source[attr];
    }
    else {
      destination[attr] = source[attr];
    }
  }
  return destination;
}

//summarizes the account balances by currency 
function calcSummaryBalances(data) {
  console.log('Summary balances:');
  summaryBalances = new Array();
  for (var i = 0; i < data.length; i++) {
    summaryBalances = combineBalanceArrays(summaryBalances, data[i]['balances']);
  }
  return summaryBalances;
}
