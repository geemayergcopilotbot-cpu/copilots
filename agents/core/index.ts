export const CoreAgent = {
  name: "core",
  async run(message: string) {
    return `[core] received: ${message}`;
  }
};
