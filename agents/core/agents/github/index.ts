export const GitHubAgent = {
  name: "github",
  async run(event: any) {
    console.log("[github] event received", event);
    return "github processed event";
  }
};
