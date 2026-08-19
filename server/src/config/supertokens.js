const supertokens = require("supertokens-node");
const EmailPassword = require("supertokens-node/recipe/emailpassword");
const ThirdParty =
    require("supertokens-node/recipe/thirdparty");
const Session = require("supertokens-node/recipe/session");

supertokens.init({
  framework: "express",

  supertokens: {
    connectionURI: process.env.SUPERTOKENS_CONNECTION_URI,
  },

  appInfo: {
    appName: "Loan Application",
    apiDomain: "http://localhost:5000",
    websiteDomain: "http://localhost:5173",

    apiBasePath: "/auth",
    websiteBasePath: "/auth",
  },

  recipeList: [
    EmailPassword.init(),
    ThirdParty.init({
            signInAndUpFeature: {
                providers: [
                    {
                        config: {
                            thirdPartyId: "google",

                            clients: [
                                {
                                    clientId:
                                        process.env.GOOGLE_CLIENT_ID,

                                    clientSecret:
                                        process.env.GOOGLE_CLIENT_SECRET,
                                }
                            ]
                        }
                    }
                ]
            }
        }),
    Session.init(),
  ],
});