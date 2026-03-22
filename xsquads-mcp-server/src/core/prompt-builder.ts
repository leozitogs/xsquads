import type { Squad } from "../types/index.js";

export interface ActivationPrompt {
  systemMessage: string;
  userMessage: string;
}

/**
 * Builds an activation prompt for a squad given a user objective and context.
 * The prompt includes the orchestrator agent definition, available specialists,
 * tasks, and workflows so the LLM can operate as the squad.
 */
export function buildActivationPrompt(
  squad: Squad,
  objective: string,
  context?: string
): ActivationPrompt {
  const orchestrator = squad.agents.find(
    (a) => a.id.includes("chief") || a.id.includes("orchestrator") || a.id.includes("architect")
  );

  const specialistList = squad.agents
    .filter((a) => a !== orchestrator)
    .map((a) => `- @${a.id}`)
    .join("\n");

  const taskList = squad.tasks.map((t) => `- *${t.id}`).join("\n");

  const workflowList = squad.workflows
    .map((w) => {
      const parsed = w.parsed as Record<string, unknown> | null;
      const wf = parsed?.workflow as Record<string, unknown> | undefined;
      const trigger = wf?.trigger || w.id;
      return `- ${trigger}: ${wf?.name || w.id}`;
    })
    .join("\n");

  const systemParts: string[] = [
    `# Squad Activation: ${squad.metadata.shortTitle}`,
    "",
    squad.metadata.description,
    "",
  ];

  if (orchestrator) {
    systemParts.push("## Orchestrator Definition");
    systemParts.push("");
    systemParts.push(orchestrator.content);
    systemParts.push("");
  }

  if (specialistList) {
    systemParts.push("## Available Specialists");
    systemParts.push(specialistList);
    systemParts.push("");
  }

  if (taskList) {
    systemParts.push("## Available Tasks");
    systemParts.push(taskList);
    systemParts.push("");
  }

  if (workflowList) {
    systemParts.push("## Available Workflows");
    systemParts.push(workflowList);
    systemParts.push("");
  }

  if (squad.checklists.length > 0) {
    systemParts.push("## Quality Checklists");
    for (const cl of squad.checklists) {
      systemParts.push(`### ${cl.id}`);
      systemParts.push(cl.content);
      systemParts.push("");
    }
  }

  const systemMessage = systemParts.join("\n");

  const userParts: string[] = [
    `## Objective`,
    "",
    objective,
  ];

  if (context) {
    userParts.push("");
    userParts.push("## Additional Context");
    userParts.push("");
    userParts.push(context);
  }

  userParts.push("");
  userParts.push(
    "Please activate the squad, diagnose the challenge, route to the appropriate specialist(s), and execute the best approach."
  );

  const userMessage = userParts.join("\n");

  return { systemMessage, userMessage };
}

/**
 * Builds a combined activation prompt for multiple squads working together.
 */
export function buildCombinedPrompt(
  squads: Squad[],
  objective: string,
  context?: string
): ActivationPrompt {
  const systemParts: string[] = [
    "# Multi-Squad Activation",
    "",
    `You are orchestrating ${squads.length} specialized squads to accomplish a complex objective.`,
    "Each squad has its own specialists, tasks, and workflows. Coordinate between them.",
    "",
  ];

  for (const squad of squads) {
    systemParts.push(`## ${squad.metadata.shortTitle}`);
    systemParts.push(squad.metadata.description);
    systemParts.push("");

    const orchestrator = squad.agents.find(
      (a) => a.id.includes("chief") || a.id.includes("orchestrator")
    );

    if (orchestrator) {
      systemParts.push(`### Orchestrator: @${orchestrator.id}`);
      systemParts.push("");
    }

    const specialists = squad.agents
      .filter((a) => a !== orchestrator)
      .map((a) => `- @${a.id}`)
      .join("\n");

    if (specialists) {
      systemParts.push("### Specialists");
      systemParts.push(specialists);
      systemParts.push("");
    }

    const tasks = squad.tasks.map((t) => `- *${t.id}`).join("\n");
    if (tasks) {
      systemParts.push("### Tasks");
      systemParts.push(tasks);
      systemParts.push("");
    }

    systemParts.push("---");
    systemParts.push("");
  }

  const systemMessage = systemParts.join("\n");

  const userParts: string[] = [
    "## Objective",
    "",
    objective,
  ];

  if (context) {
    userParts.push("");
    userParts.push("## Additional Context");
    userParts.push("");
    userParts.push(context);
  }

  userParts.push("");
  userParts.push(
    "Coordinate the squads in the optimal sequence. For each step, indicate which squad and specialist is handling it. Ensure quality gates between squad handoffs."
  );

  const userMessage = userParts.join("\n");

  return { systemMessage, userMessage };
}
