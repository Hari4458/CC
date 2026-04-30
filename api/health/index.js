module.exports = async function (context, req) {
    context.res = {
        status: 200,
        body: {
            status: "Online",
            message: "App Insights Link Active",
            timestamp: new Date().toISOString()
        }
    };
};
