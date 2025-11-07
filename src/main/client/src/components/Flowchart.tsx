import { useEffect, useState, useCallback, memo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import axios from "axios";
import dagre from "@dagrejs/dagre";

interface Course {
  id: number;
  name: string;
  courseIdent: string;
  credits: number;
  prerequisites: string[];
  description: string;
  offered: string;
}

type CourseData = { label: string; cls: string; title?: string };

const CourseNode = memo(({ data }: NodeProps<CourseData>) => (
  <div
    title={data.title}
    className={[
      "w-16 h-16 rounded-full",
      "flex items-center justify-center text-center",
      "font-semibold text-xs shadow-sm cursor-default",
      "transition-transform duration-200 hover:scale-105",
      data.cls,
    ].join(" ")}
  >
    {data.label}
    <Handle type="target" position={Position.Top} className="!opacity-0" />
    <Handle type="source" position={Position.Bottom} className="!opacity-0" />
  </div>
));

const nodeTypes = { course: CourseNode };

function transitiveReduction(edges: Edge[]): Edge[] {
  const graph: Record<string, Set<string>> = {};
  edges.forEach((e) => (graph[e.source] ??= new Set()).add(e.target));

  const reachable: Record<string, Set<string>> = {};
  const dfs = (start: string, node: string) => {
    if (!graph[node]) return;
    for (const next of graph[node]) {
      if (!reachable[start].has(next)) {
        reachable[start].add(next);
        dfs(start, next);
      }
    }
  };

  Object.keys(graph).forEach((src) => {
    reachable[src] = new Set();
    dfs(src, src);
  });

  return edges.filter((e) => {
    for (const mid of Object.keys(graph)) {
      if (mid !== e.source && mid !== e.target) {
        if (reachable[e.source]?.has(mid) && reachable[mid]?.has(e.target))
          return false;
      }
    }
    return true;
  });
}

const nodeWidth = 120;
const nodeHeight = 70;

function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction, // top to bottom
    align: "UL", // tight horizontal alignment
    nodesep: 30, // tighter horizontal spacing
    ranksep: 70, // tighter vertical spacing
    marginx: 10,
    marginy: 10,
  });

  nodes.forEach((n) =>
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const yGroups: Record<number, Node[]> = {};
  nodes.forEach((n) => {
    const pos = g.node(n.id);
    const y = Math.round(pos.y / 50) * 50;
    if (!yGroups[y]) yGroups[y] = [];
    yGroups[y].push(n);
  });

  Object.values(yGroups).forEach((group) => {
    group.sort((a, b) => g.node(a.id).x - g.node(b.id).x);
    const mid = group.length / 2;
    group.forEach((node, i) => {
      const pos = g.node(node.id);
      const offset = (i - mid + 0.5) * 140; // tighten side spacing
      node.position = { x: offset, y: pos.y - nodeHeight / 2 };
    });
  });

  return nodes.map((n) => ({
    ...n,
    position: n.position ?? {
      x: g.node(n.id).x - nodeWidth / 2,
      y: g.node(n.id).y - nodeHeight / 2,
    },
  }));
}

const deptClasses: Record<string, string> = {
  COMS: "bg-sky-500 text-white",
  SE: "bg-rose-500 text-white",
  CPRE: "bg-orange-400 text-white",
  MATH: "bg-pink-400 text-white",
  PHYS: "bg-green-400 text-white",
  ENGL: "bg-yellow-300 text-black",
  STAT: "bg-purple-500 text-white",
  CHEM: "bg-emerald-400 text-white",
  ECON: "bg-cyan-400 text-white",
  LIB: "bg-blue-400 text-white",
  IE: "bg-amber-500 text-white",
  SPCM: "bg-amber-300 text-black",
  ART: "bg-indigo-400 text-white",
  SUPP: "bg-transparent border-2 border-dashed border-green-500 text-green-700",
  GEN: "bg-transparent border-2 border-dashed border-gray-400 text-gray-700",
  OPEN: "bg-transparent border-2 border-dashed border-gray-400 text-gray-700",
  DEFAULT: "bg-gray-400 text-white",
};

export default function Flowchart() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/courses/all")
      .then((res) => setCourses(res.data));
  }, []);

  useEffect(() => {
    if (courses.length === 0) return;

    const extras: Partial<Course>[] = [
      {
        courseIdent: "SUPP_ELEC",
        name: "Supplemental Elective",
        prerequisites: [],
      },
      { courseIdent: "SE_ELEC", name: "SE Elective", prerequisites: [] },
      { courseIdent: "GEN_ELEC", name: "General Elective", prerequisites: [] },
      { courseIdent: "OPEN_ELEC", name: "Open Elective", prerequisites: [] },
    ];

    const all = [...courses, ...extras] as Course[];

    const newNodes: Node<CourseData>[] = all.map((c) => {
      const prefix = c.courseIdent.split("_")[0];
      const cls = deptClasses[prefix] || deptClasses.DEFAULT;
      return {
        id: c.courseIdent,
        type: "course",
        data: { label: c.courseIdent.replace("_", " "), cls, title: c.name },
        position: { x: 0, y: 0 },
      };
    });

    const rawEdges: Edge[] = [];
    courses.forEach((c) => {
      c.prerequisites?.forEach((pre) => {
        if (!pre) return;
        rawEdges.push({
          id: `${pre}->${c.courseIdent}`,
          source: pre,
          target: c.courseIdent,
          type: "smoothstep",
          style: { stroke: "#555", strokeWidth: 1.5 },
        });
      });
    });

    const reduced = transitiveReduction(rawEdges);
    const layouted = layoutWithDagre(newNodes, reduced, "TB");

    setNodes(layouted);
    setEdges(reduced);
  }, [courses]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="h-[90vh] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <MiniMap className="!bg-gray-50" />
        <Controls className="!bg-white !rounded-lg !shadow" />
        <Background gap={12} size={1} className="bg-white" />
      </ReactFlow>
    </div>
  );
}
