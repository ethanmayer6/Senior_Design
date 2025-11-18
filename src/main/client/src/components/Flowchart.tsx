// ---------------------------------------------
// Imports
// ---------------------------------------------
import { useEffect, useCallback, memo } from "react";
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
  type Connection,
} from "reactflow";

import "reactflow/dist/style.css";
import type { FlowchartResult } from "../types/flowchartResult";

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
type SemesterData = { title: string };

// ---------------------------------------------
// Node Types
// ---------------------------------------------
const CourseNode = memo(({ data }: NodeProps<CourseData>) => (
  <div
    title={data.title}
    className={[
      "w-16 h-16 rounded-full",
      "flex items-center justify-center text-center",
      "font-semibold text-xs shadow-sm cursor-default",
      data.cls,
    ].join(" ")}
  >
    {data.label}
    <Handle type="target" position={Position.Top} className="opacity-0" />
    <Handle type="source" position={Position.Bottom} className="opacity-0" />
  </div>
));

const SemesterNode = memo(({ data }: NodeProps<SemesterData>) => (
  <div
    className="rounded-xl border border-gray-400 bg-gray-50 p-2 shadow-sm"
    style={{ width: 600, height: 180 }}
  >
    <div className="text-sm font-bold text-gray-700 mb-1">{data.title}</div>
  </div>
));

const nodeTypes = {
  course: CourseNode,
  semester: SemesterNode,
};

// ---------------------------------------------
// Constants
// ---------------------------------------------
const X_SPACING = 150;
const Y_SPACING = 250;

// Department colors
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
  DEFAULT: "bg-gray-400 text-white",
};

// ---------------------------------------------
// Semester Parsing → numeric rank
// ---------------------------------------------
function parseAcademicPeriod(period: string | null): number {
  if (!period) return 99999;
  const p = period.toUpperCase();

  if (/SPRING/.test(p)) return Number(p.match(/20\d{2}/)![0]) * 10 + 1;
  if (/SUMMER/.test(p)) return Number(p.match(/20\d{2}/)![0]) * 10 + 2;
  if (/FALL/.test(p)) return Number(p.match(/20\d{2}/)![0]) * 10 + 3;
  if (/WINTER/.test(p)) return Number(p.match(/20\d{2}/)![0]) * 10 + 4;

  const year = p.match(/20\d{2}/);
  return year ? Number(year[0]) * 10 + 5 : 99999;
}

// ---------------------------------------------
// Component
// ---------------------------------------------
export default function Flowchart({
  flowData,
}: {
  flowData: FlowchartResult | null;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!flowData) return;

    const {
      courses,
      edges: rawEdges,
      completedCourses,
      academicPeriods,
    } = flowData;

    const isCompleted = (id: string) => completedCourses.includes(id);

    const getNodeColor = (c: Course) => {
      const prefix = c.courseIdent.split("_")[0];
      const dept = deptClasses[prefix] || deptClasses.DEFAULT;
      return isCompleted(c.courseIdent) ? "bg-green-500 text-white" : dept;
    };

    // ---------------------------------------------
    // Group courses by semester
    // ---------------------------------------------
    const groups: Record<number, Course[]> = {};

    courses.forEach((c) => {
      const period = academicPeriods[c.courseIdent] ?? null;
      const rank = parseAcademicPeriod(period);
      if (!groups[rank]) groups[rank] = [];
      groups[rank].push(c);
    });

    const sortedRanks = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b);

    const newNodes: Node[] = [];

    // ---------------------------------------------
    // Create semester group nodes + course child nodes
    // ---------------------------------------------
    sortedRanks.forEach((rank, i) => {
      const semesterId = `SEM_${rank}`;
      const rowCourses = groups[rank];

      // Create the semester group node
      newNodes.push({
        id: semesterId,
        type: "semester",
        position: { x: 0, y: i * Y_SPACING },
        data: { title: `Semester ${i + 1}` },
        style: { width: 600, height: 180 },
        draggable: false,
      });

      // Now create child nodes inside it
      rowCourses.forEach((c, col) => {
        newNodes.push({
          id: c.courseIdent,
          type: "course",
          data: {
            label: c.courseIdent.replace("_", " "),
            cls: getNodeColor(c),
            title: c.name,
          },
          parentNode: semesterId,
          extent: "parent",
          position: {
            x: 40 + col * X_SPACING,
            y: 40,
          },
        });
      });
    });

    // ---------------------------------------------
    // Build edges normally
    // ---------------------------------------------
    const newEdges: Edge[] = rawEdges.map(([src, tgt]) => ({
      id: `${src}->${tgt}`,
      source: src,
      target: tgt,
      type: "smoothstep",
      animated: false,
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [flowData]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  return (
    <div className="h-[90vh] w-full border rounded">
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
        <MiniMap />
        <Controls />
        <Background gap={12} />
      </ReactFlow>
    </div>
  );
}
