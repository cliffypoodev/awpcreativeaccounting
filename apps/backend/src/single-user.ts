import { env } from "./env";
import { prisma } from "./prisma";

let ownerPromise: ReturnType<typeof loadOwner> | undefined;

async function loadOwner() {
  return prisma.user.upsert({
    where: { email: env.SINGLE_USER_EMAIL.toLowerCase() },
    create: {
      id: "awp-single-owner",
      name: env.SINGLE_USER_NAME,
      email: env.SINGLE_USER_EMAIL.toLowerCase(),
      emailVerified: true,
    },
    update: {
      name: env.SINGLE_USER_NAME,
      emailVerified: true,
    },
  });
}

/**
 * Return the one server-configured owner. The promise is shared so concurrent
 * first-page requests cannot race while the user record is being provisioned.
 */
export function getSingleUser() {
  if (!ownerPromise) {
    ownerPromise = loadOwner().catch((error) => {
      ownerPromise = undefined;
      throw error;
    });
  }
  return ownerPromise;
}
