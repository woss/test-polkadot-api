import { ApiPromise, WsProvider } from "@polkadot/api";
import customTypes from "./NetworkCustomTypes.json";

const sender = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const recipient = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

async function main() {
  // Construct
  const wsProvider = new WsProvider("ws://localhost:9944");
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: customTypes,
  });

  api.tx.balances
    .transfer(recipient, 123)
    .signAndSend(sender, ({ status, events }) => {
      if (status.isInBlock || status.isFinalized) {
        events
          // find/filter for failed events
          .filter(
            ({ event: { section, method } }) =>
              section === "system" && method === "ExtrinsicFailed"
          )
          // we know that data for system.ExtrinsicFailed is
          // (DispatchError, DispatchInfo)
          // ERROR: Property 'data' does not exist on type 'EventRecord'.ts(2339)
          .forEach(({ event }) => {
            const { data } = event;
            const [error, info] = data;
            if (error.isModule) {
              // for module errors, we have the section indexed, lookup
              const decoded = api.registry.findMetaError(error.asModule);
              // ERROR:  Property 'method' does not exist on type 'RegistryError'.ts(2339)
              const { documentation, method, section } = decoded;

              console.log(`${section}.${method}: ${documentation.join(" ")}`);
            } else {
              // Other, CannotLookup, BadOrigin, no extra info
              console.log(error.toString());
            }
          });
      }
    });
}

main().then(console.log).catch(console.error);
