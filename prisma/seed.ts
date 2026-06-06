import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const s = (arr: string[]) => JSON.stringify(arr);

async function main() {
  console.log("🌱 Seeding database...");

  // Clear in dependency order
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.proof.deleteMany();
  await prisma.swap.deleteMany();
  await prisma.user.deleteMany();

  console.log("🗑️  Cleared existing data");

  const pw = await bcrypt.hash("password123", 12);

  // ─── Users ────────────────────────────────────────────────────────────────
  const [alice, hiroshi, luisa, karl, priya, seoYeon, etienne, diego, amira, lars, jordan, maya] =
    await Promise.all([
      prisma.user.create({
        data: {
          name: "Alice Chen",
          email: "alice@fakeemail.xyz",
          password: pw,
          teachSkill: s(["React", "Next.js"]),
          learnSkill: s(["Python", "Machine Learning"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Hiroshi Tanaka",
          email: "hiroshi@fakeemail.xyz",
          password: pw,
          teachSkill: s(["Machine Learning", "TensorFlow"]),
          learnSkill: s(["React", "TypeScript"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Luisa Santos",
          email: "luisa@fakeemail.xyz",
          password: pw,
          teachSkill: s(["Spanish", "Portuguese"]),
          learnSkill: s(["Rust", "WebAssembly"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Karl Weber",
          email: "karl@fakeemail.xyz",
          password: pw,
          teachSkill: s(["Kubernetes", "Docker"]),
          learnSkill: s(["Figma", "UI Design"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Priya Sharma",
          email: "priya@fakeemail.xyz",
          password: pw,
          teachSkill: s(["Data Science", "Pandas"]),
          learnSkill: s(["Docker", "Kubernetes"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Seo-Yeon Park",
          email: "seoyeon@fakeemail.xyz",
          password: pw,
          teachSkill: s(["UI/UX Design", "Figma"]),
          learnSkill: s(["Node.js", "Express"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Étienne Dubois",
          email: "etienne@fakeemail.xyz",
          password: pw,
          teachSkill: s(["French Language", "Translation"]),
          learnSkill: s(["React Native", "Mobile Dev"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Diego Morales",
          email: "diego@fakeemail.xyz",
          password: pw,
          teachSkill: s(["Go", "gRPC"]),
          learnSkill: s(["TypeScript", "React"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Amira Hassan",
          email: "amira@fakeemail.xyz",
          password: pw,
          teachSkill: s(["Arabic", "Calligraphy"]),
          learnSkill: s(["Vue.js", "Nuxt"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Lars Eriksson",
          email: "lars@fakeemail.xyz",
          password: pw,
          teachSkill: s(["PostgreSQL", "Database Design"]),
          learnSkill: s(["Swift", "iOS Dev"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Jordan Taylor",
          email: "jordan@fakeemail.xyz",
          password: pw,
          teachSkill: s(["Swift", "SwiftUI"]),
          learnSkill: s(["Machine Learning", "Python"]),
        },
      }),
      prisma.user.create({
        data: {
          name: "Maya Patel",
          email: "maya@fakeemail.xyz",
          password: pw,
          teachSkill: s(["TypeScript", "GraphQL"]),
          learnSkill: s(["Kubernetes", "DevOps"]),
        },
      }),
    ]);

  console.log("👥 Created 12 users");

  // ─── Swaps ────────────────────────────────────────────────────────────────

  // 1. PENDING — Alice requested swap with Hiroshi
  const swapPending1 = await prisma.swap.create({
    data: {
      initiatorId: alice.id,
      receiverId: hiroshi.id,
      status: "PENDING",
    },
  });

  // 2. PENDING — Étienne requested swap with Diego
  const swapPending2 = await prisma.swap.create({
    data: {
      initiatorId: etienne.id,
      receiverId: diego.id,
      status: "PENDING",
    },
  });

  // 3. ACTIVE — Luisa ↔ Karl, no deliveries yet
  const swapActive1 = await prisma.swap.create({
    data: {
      initiatorId: luisa.id,
      receiverId: karl.id,
      status: "ACTIVE",
    },
  });

  // 4. ACTIVE — Priya ↔ Seo-Yeon, Priya delivered, Seo-Yeon hasn't
  const swapActive2 = await prisma.swap.create({
    data: {
      initiatorId: priya.id,
      receiverId: seoYeon.id,
      status: "ACTIVE",
      initiatorDelivered: true,
    },
  });

  // 5. ACTIVE — Diego ↔ Amira, both delivered, both marked done → still ACTIVE until proof
  const swapActive3 = await prisma.swap.create({
    data: {
      initiatorId: diego.id,
      receiverId: amira.id,
      status: "ACTIVE",
      initiatorDone: true,
      receiverDone: false,
      initiatorDelivered: true,
      receiverDelivered: true,
    },
  });

  // 6. COMPLETED — Lars ↔ Jordan
  const completedAt1 = new Date("2026-05-20T10:00:00Z");
  const swapCompleted1 = await prisma.swap.create({
    data: {
      initiatorId: lars.id,
      receiverId: jordan.id,
      status: "COMPLETED",
      initiatorDone: true,
      receiverDone: true,
      initiatorDelivered: true,
      receiverDelivered: true,
      completedAt: completedAt1,
      adaTxHash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    },
  });

  // 7. COMPLETED — Maya ↔ Étienne (different from swap 2)
  const completedAt2 = new Date("2026-05-28T14:30:00Z");
  const swapCompleted2 = await prisma.swap.create({
    data: {
      initiatorId: maya.id,
      receiverId: karl.id,
      status: "COMPLETED",
      initiatorDone: true,
      receiverDone: true,
      initiatorDelivered: true,
      receiverDelivered: true,
      completedAt: completedAt2,
      adaTxHash: "b2c3d4e5f67890123456789012345678901bcdef2345678901bcdef2345678",
    },
  });

  // 8. DECLINED — Amira requested, Alice declined
  const swapDeclined = await prisma.swap.create({
    data: {
      initiatorId: amira.id,
      receiverId: alice.id,
      status: "DECLINED",
    },
  });

  console.log("🔄 Created 8 swaps (2 PENDING, 3 ACTIVE, 2 COMPLETED, 1 DECLINED)");

  // ─── Deliveries ───────────────────────────────────────────────────────────

  // swapActive2: Priya delivered
  await prisma.delivery.create({
    data: {
      swapId: swapActive2.id,
      userId: priya.id,
      resourceLink: "https://notion.so/fake-data-science-notes",
      notes: "Here are my Pandas and NumPy crash course notes. Covers DataFrames, groupby, and matplotlib basics.",
    },
  });

  // swapActive3: Diego delivered
  await prisma.delivery.create({
    data: {
      swapId: swapActive3.id,
      userId: diego.id,
      resourceLink: "https://github.com/fake-user/go-grpc-tutorial",
      notes: "Complete gRPC tutorial repo with examples. Run `go run main.go` to start.",
    },
  });

  // swapActive3: Amira delivered
  await prisma.delivery.create({
    data: {
      swapId: swapActive3.id,
      userId: amira.id,
      resourceLink: "https://drive.google.com/fake/arabic-beginner-pack",
      notes: "Beginner Arabic pack: alphabet PDF, pronunciation audio files, and 100 common phrases.",
    },
  });

  // swapCompleted1: Lars delivered
  await prisma.delivery.create({
    data: {
      swapId: swapCompleted1.id,
      userId: lars.id,
      resourceLink: "https://dbdiagram.io/fake/postgres-schema-guide",
      notes: "PostgreSQL schema design guide with ERD diagrams, indexing tips, and query optimization.",
      submittedAt: new Date("2026-05-15T09:00:00Z"),
    },
  });

  // swapCompleted1: Jordan delivered
  await prisma.delivery.create({
    data: {
      swapId: swapCompleted1.id,
      userId: jordan.id,
      resourceLink: "https://github.com/fake-user/swiftui-starter",
      notes: "SwiftUI starter project: covers state management, navigation, and async data fetching.",
      submittedAt: new Date("2026-05-16T11:30:00Z"),
    },
  });

  // swapCompleted2: Maya delivered
  await prisma.delivery.create({
    data: {
      swapId: swapCompleted2.id,
      userId: maya.id,
      resourceLink: "https://codesandbox.io/fake/graphql-typescript-demo",
      notes: "GraphQL + TypeScript full-stack demo. Apollo Server + React Apollo Client.",
      submittedAt: new Date("2026-05-22T10:00:00Z"),
    },
  });

  // swapCompleted2: Karl delivered
  await prisma.delivery.create({
    data: {
      swapId: swapCompleted2.id,
      userId: karl.id,
      resourceLink: "https://github.com/fake-user/k8s-local-setup",
      notes: "Local Kubernetes setup guide with minikube, helm charts, and ingress configuration.",
      submittedAt: new Date("2026-05-23T14:00:00Z"),
    },
  });

  console.log("📦 Created 7 deliveries");

  // ─── Proofs ───────────────────────────────────────────────────────────────

  await prisma.proof.create({
    data: {
      swapId: swapCompleted1.id,
      userId: lars.id,
      teachSkill: "PostgreSQL",
      learnSkill: "Swift",
      adaTxHash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      metadataHash: "deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      summary: "Lars taught PostgreSQL schema design and query optimization. Jordan taught SwiftUI fundamentals.",
      createdAt: completedAt1,
    },
  });

  await prisma.proof.create({
    data: {
      swapId: swapCompleted2.id,
      userId: maya.id,
      teachSkill: "TypeScript",
      learnSkill: "Kubernetes",
      adaTxHash: "b2c3d4e5f67890123456789012345678901bcdef2345678901bcdef2345678",
      metadataHash: "cafebabe1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      summary: "Maya taught TypeScript + GraphQL. Karl taught Kubernetes cluster management with Helm.",
      createdAt: completedAt2,
    },
  });

  console.log("📜 Created 2 proofs");

  // ─── Messages ─────────────────────────────────────────────────────────────

  const msgs: Array<{ swapId: string; senderId: string; content: string; at: string }> = [
    { swapId: swapActive1.id, senderId: luisa.id, content: "Hey Karl! Excited to get started. When works for our first session?", at: "2026-06-01T08:00:00Z" },
    { swapId: swapActive1.id, senderId: karl.id, content: "Hi Luisa! How about Saturday 10am UTC? I'll prep a Docker basics walkthrough.", at: "2026-06-01T09:30:00Z" },
    { swapId: swapActive1.id, senderId: luisa.id, content: "Perfect! I'll prepare a Spanish conversation starter pack for you.", at: "2026-06-01T10:00:00Z" },

    { swapId: swapActive2.id, senderId: priya.id, content: "Seo-Yeon, I've uploaded my Data Science notes. Let me know if anything needs clarification!", at: "2026-06-02T11:00:00Z" },
    { swapId: swapActive2.id, senderId: seoYeon.id, content: "These are amazing, thank you! I'm still working on the Figma design system — will share by Friday.", at: "2026-06-02T13:00:00Z" },

    { swapId: swapActive3.id, senderId: diego.id, content: "Amira, uploaded the Go tutorial. The repo has a README with setup instructions.", at: "2026-06-03T09:00:00Z" },
    { swapId: swapActive3.id, senderId: amira.id, content: "شكراً Diego! I've shared the Arabic pack too. Let me know if you have questions!", at: "2026-06-03T10:00:00Z" },
    { swapId: swapActive3.id, senderId: diego.id, content: "This is incredible, I've already started the alphabet exercises. Ready to mark this complete?", at: "2026-06-03T12:00:00Z" },

    { swapId: swapCompleted1.id, senderId: lars.id, content: "Jordan, your SwiftUI starter was exactly what I needed. Marking my side complete!", at: "2026-05-19T10:00:00Z" },
    { swapId: swapCompleted1.id, senderId: jordan.id, content: "Same here! The PostgreSQL indexing guide saved me hours on my project. Great swap!", at: "2026-05-19T11:00:00Z" },

    { swapId: swapCompleted2.id, senderId: maya.id, content: "Karl, your K8s guide is thorough. I finally got minikube running locally!", at: "2026-05-27T09:00:00Z" },
    { swapId: swapCompleted2.id, senderId: karl.id, content: "Maya, the GraphQL demo was exactly what I was looking for. Marking done on my end.", at: "2026-05-27T10:30:00Z" },
  ];

  for (const m of msgs) {
    await prisma.message.create({
      data: {
        swapId: m.swapId,
        senderId: m.senderId,
        content: m.content,
        createdAt: new Date(m.at),
      },
    });
  }

  console.log(`💬 Created ${msgs.length} messages`);

  // ─── Notifications ────────────────────────────────────────────────────────

  const notifs: Array<{ userId: string; type: string; message: string; read: boolean; at: string }> = [
    // Hiroshi: Alice sent you a swap request
    { userId: hiroshi.id, type: "SWAP_REQUEST", message: "Alice Chen wants to swap React skills for your Machine Learning expertise.", read: false, at: "2026-06-04T08:00:00Z" },
    // Diego: Étienne sent you a swap request
    { userId: diego.id, type: "SWAP_REQUEST", message: "Étienne Dubois wants to swap French Language skills for your Go expertise.", read: false, at: "2026-06-04T09:00:00Z" },
    // Karl: Luisa accepted your swap
    { userId: karl.id, type: "SWAP_ACCEPTED", message: "Luisa Santos accepted your skill swap request.", read: true, at: "2026-06-01T07:30:00Z" },
    // Luisa: Karl accepted your swap
    { userId: luisa.id, type: "SWAP_ACCEPTED", message: "Karl Weber accepted your skill swap request.", read: true, at: "2026-06-01T07:30:00Z" },
    // Seo-Yeon: Priya accepted swap
    { userId: seoYeon.id, type: "SWAP_ACCEPTED", message: "Priya Sharma accepted your skill swap request.", read: true, at: "2026-06-01T10:00:00Z" },
    // Seo-Yeon: Priya submitted delivery
    { userId: seoYeon.id, type: "SWAP_REQUEST", message: "Priya Sharma submitted their deliverable for your swap.", read: false, at: "2026-06-02T11:05:00Z" },
    // Lars: swap completed
    { userId: lars.id, type: "SWAP_COMPLETED", message: "Your swap with Jordan Taylor is complete! Proof recorded on-chain.", read: true, at: "2026-05-20T10:01:00Z" },
    // Jordan: swap completed
    { userId: jordan.id, type: "SWAP_COMPLETED", message: "Your swap with Lars Eriksson is complete! Proof recorded on-chain.", read: true, at: "2026-05-20T10:01:00Z" },
    // Maya: swap completed
    { userId: maya.id, type: "SWAP_COMPLETED", message: "Your swap with Karl Weber is complete! Proof recorded on-chain.", read: false, at: "2026-05-28T14:31:00Z" },
    // Alice: her request to Amira was declined (swapDeclined)
    { userId: amira.id, type: "SWAP_DECLINED", message: "Alice Chen declined your skill swap request.", read: false, at: "2026-06-03T15:00:00Z" },
    // Perfect match notifications
    { userId: alice.id, type: "PERFECT_MATCH", message: "You have a new perfect match! Hiroshi Tanaka teaches Machine Learning and wants to learn React.", read: true, at: "2026-05-30T08:00:00Z" },
    { userId: maya.id, type: "PERFECT_MATCH", message: "New perfect match: Karl Weber teaches Kubernetes and wants to learn TypeScript.", read: true, at: "2026-05-25T08:00:00Z" },
    { userId: priya.id, type: "PERFECT_MATCH", message: "New perfect match: Karl Weber teaches Kubernetes and wants to learn Data Science.", read: false, at: "2026-06-01T08:00:00Z" },
  ];

  for (const n of notifs) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type as never,
        message: n.message,
        read: n.read,
        createdAt: new Date(n.at),
      },
    });
  }

  console.log(`🔔 Created ${notifs.length} notifications`);

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Test accounts (all use password: password123):");
  console.log("   alice@fakeemail.xyz  — React teacher, 1 PENDING swap");
  console.log("   hiroshi@fakeemail.xyz — ML teacher, 1 PENDING swap request");
  console.log("   luisa@fakeemail.xyz  — Spanish teacher, 1 ACTIVE swap");
  console.log("   karl@fakeemail.xyz   — Kubernetes teacher, 1 ACTIVE + 1 COMPLETED swap");
  console.log("   priya@fakeemail.xyz  — Data Science teacher, 1 ACTIVE swap (delivered)");
  console.log("   seoyeon@fakeemail.xyz — UI/UX teacher, 1 ACTIVE swap (waiting)");
  console.log("   diego@fakeemail.xyz  — Go teacher, 1 ACTIVE swap (both delivered)");
  console.log("   amira@fakeemail.xyz  — Arabic teacher, 1 ACTIVE + 1 DECLINED swap");
  console.log("   lars@fakeemail.xyz   — PostgreSQL teacher, 1 COMPLETED swap");
  console.log("   jordan@fakeemail.xyz — Swift teacher, 1 COMPLETED swap");
  console.log("   maya@fakeemail.xyz   — TypeScript teacher, 1 COMPLETED swap");
  console.log("   etienne@fakeemail.xyz — French teacher, 1 PENDING swap");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
