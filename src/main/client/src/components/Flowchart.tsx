// src/components/Flowchart.tsx
import { memo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow';

import 'reactflow/dist/style.css';
import type { Course as FlowchartCourse, CourseStatus, Flowchart as FlowchartEntity } from '../api/flowchartApi';
import { createStatusLookup, normalizeStatus, resolveCourseStatus } from '../utils/flowchartStatus';

type CourseData = {
  label: string;
  cls: string;
  title?: string;
  status?: CourseStatus;
  course?: FlowchartCourse;
};

type SemesterData = {
  title: string;
  meta: string;
};

const CourseNode = memo(({ data }: NodeProps<CourseData>) => {
  const normalizedStatus = String(data.status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  const [dept, ...rest] = String(data.label ?? '').trim().split(/\s+/);
  const courseNumber = rest.join(' ');

  const statusTone: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
    UNFULFILLED: 'bg-rose-100 text-rose-800 border-rose-200',
  };
  const statusShortLabel: Record<string, string> = {
    COMPLETED: 'Done',
    IN_PROGRESS: 'IP',
    UNFULFILLED: 'Todo',
  };
  const statusClass = statusTone[normalizedStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  const statusLabel = statusShortLabel[normalizedStatus] ?? 'Plan';

  return (
    <div
      title={data.title}
      className={[
        'relative h-[5.1rem] w-[5.4rem] rounded-2xl border',
        'flex flex-col items-center justify-center text-center',
        'px-1.5 shadow-sm cursor-pointer select-none',
        data.cls,
      ].join(' ')}
    >
      <span
        className={[
          'absolute -right-2 -top-2 rounded-full border px-1.5 py-0.5',
          'text-[9px] font-semibold uppercase leading-none shadow-sm',
          statusClass,
        ].join(' ')}
      >
        {statusLabel}
      </span>

      <div className="text-[9px] font-semibold uppercase tracking-[0.08em] opacity-85">
        {dept || 'COURSE'}
      </div>
      <div className="mt-0.5 text-[13px] font-bold tracking-tight">
        {courseNumber || dept || '----'}
      </div>

      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

const SemesterNode = memo(({ data }: NodeProps<SemesterData>) => (
  <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200/90 bg-white/90 px-3 py-2">
      <div className="text-sm font-bold uppercase tracking-wide text-slate-700">{data.title}</div>
      <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {data.meta}
      </div>
    </div>
  </div>
));

const nodeTypes = {
  course: CourseNode,
  semester: SemesterNode,
};

const SEMESTER_WIDTH = 790;
const COURSE_PER_ROW = 7;
const COURSE_GAP_X = 98;
const COURSE_GAP_Y = 98;
const INNER_PADDING_X = 32;
const INNER_PADDING_Y = 56;
const MIN_SEMESTER_HEIGHT = 176;
const Y_SPACING = 34;

const deptClasses: Record<string, string> = {
  COMS: 'border-sky-200 bg-sky-50 text-sky-800',
  SE: 'border-rose-200 bg-rose-50 text-rose-800',
  CPRE: 'border-orange-200 bg-orange-50 text-orange-800',
  MATH: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  PHYS: 'border-teal-200 bg-teal-50 text-teal-800',
  ENGL: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  STAT: 'border-violet-200 bg-violet-50 text-violet-800',
  CHEM: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ECON: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  LIB: 'border-blue-200 bg-blue-50 text-blue-800',
  IE: 'border-amber-200 bg-amber-50 text-amber-800',
  SPCM: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
  ART: 'border-pink-200 bg-pink-50 text-pink-800',
  DEFAULT: 'border-slate-200 bg-slate-100 text-slate-700',
};

function normalizeCourseIdent(ident: string | undefined | null): string {
  return String(ident ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function extractPrereqs(course: FlowchartCourse): string[] {
  const explicit = Array.isArray(course.prerequisites) ? course.prerequisites.filter(Boolean) : [];
  if (explicit.length > 0) return explicit;

  const prereqText = String(course.prereq_txt ?? '').toUpperCase();
  if (!prereqText) return [];

  const prereqs: string[] = [];
  const re = /\b([A-Z]{2,8}(?:\s+[A-Z]{1,3})?)\s*[-_]?\s*(\d{4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(prereqText)) !== null) {
    const prefix = String(match[1] ?? '').replace(/[^A-Z]/g, '');
    const number = String(match[2] ?? '');
    if (prefix && number) prereqs.push(`${prefix}_${number}`);
  }
  return prereqs;
}

function semesterRank(year: number, term: string): number {
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[term?.toUpperCase()] ?? 9;
  return year * 10 + termRank;
}

export default function Flowchart({
  flowchart,
  onCourseSelect,
}: {
  flowchart: FlowchartEntity;
  onCourseSelect?: (course: FlowchartCourse) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!flowchart) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const edgeIds = new Set<string>();
    const statusLookup = createStatusLookup(flowchart.courseStatusMap);
    const semesters = Array.isArray(flowchart.semesters) ? flowchart.semesters : [];
    const sortedSems = [...semesters].sort(
      (a, b) => semesterRank(a.year, a.term) - semesterRank(b.year, b.term)
    );
    const courseNodeRefsByIdent = new Map<string, Array<{ nodeId: string; semRank: number }>>();
    const targetNodeRefs: Array<{ nodeId: string; semRank: number; course: FlowchartCourse }> = [];

    let currentY = 0;
    sortedSems.forEach((sem) => {
      const semId = `SEM_${sem.id}`;
      const semRank = semesterRank(sem.year, sem.term);
      const semesterCourses = Array.isArray(sem.courses) ? sem.courses : [];
      const uniqueSemesterCourses = semesterCourses.filter((c, idx, arr) => {
        const ident = c?.courseIdent;
        if (!ident) return false;
        return arr.findIndex((x) => x?.courseIdent === ident) === idx;
      });

      const rowsNeeded = Math.max(1, Math.ceil(uniqueSemesterCourses.length / COURSE_PER_ROW));
      const semesterHeight = Math.max(MIN_SEMESTER_HEIGHT, INNER_PADDING_Y + rowsNeeded * COURSE_GAP_Y);
      const semesterCredits = uniqueSemesterCourses.reduce((sum, course) => sum + Number(course?.credits ?? 0), 0);

      newNodes.push({
        id: semId,
        type: 'semester',
        position: { x: 80, y: currentY },
        data: {
          title: sem.year <= 0 ? 'Transfer Credit' : `${sem.term} ${sem.year}`,
          meta: `${uniqueSemesterCourses.length} courses - ${semesterCredits} cr`,
        },
        style: { width: SEMESTER_WIDTH, height: semesterHeight },
        draggable: false,
      });

      let placedCount = 0;
      uniqueSemesterCourses.forEach((c) => {
        if (!c) return;
        const colIndex = placedCount % COURSE_PER_ROW;
        const rowIndex = Math.floor(placedCount / COURSE_PER_ROW);

        const courseIdent = c.courseIdent || `UNKNOWN_${sem.id}_${placedCount}`;
        const prefix = courseIdent.split('_')[0];
        const status = resolveCourseStatus(statusLookup, courseIdent);
        const normalizedStatus = normalizeStatus(status);
        const deptTone = deptClasses[prefix] || deptClasses.DEFAULT;
        const statusTone =
          normalizedStatus === 'COMPLETED'
            ? 'ring-2 ring-emerald-200'
            : normalizedStatus === 'IN_PROGRESS'
              ? 'ring-2 ring-amber-200'
              : normalizedStatus === 'UNFULFILLED'
                ? 'ring-2 ring-rose-200'
                : '';
        const cls = `${deptTone} ${statusTone}`.trim();
        const nodeId = `${semId}__${courseIdent}__${placedCount}`;

        newNodes.push({
          id: nodeId,
          type: 'course',
          data: {
            label: courseIdent.replace('_', ' '),
            cls,
            title: `${c.name}${status ? ` (${status})` : ''}`,
            status,
            course: c,
          },
          parentNode: semId,
          extent: 'parent',
          draggable: false,
          position: {
            x: INNER_PADDING_X + colIndex * COURSE_GAP_X,
            y: INNER_PADDING_Y + rowIndex * COURSE_GAP_Y,
          },
        });
        const normalizedIdent = normalizeCourseIdent(courseIdent);
        if (normalizedIdent) {
          if (!courseNodeRefsByIdent.has(normalizedIdent)) {
            courseNodeRefsByIdent.set(normalizedIdent, []);
          }
          courseNodeRefsByIdent.get(normalizedIdent)?.push({ nodeId, semRank });
        }
        targetNodeRefs.push({ nodeId, semRank, course: c });
        placedCount++;
      });

      currentY += semesterHeight + Y_SPACING;
    });

    targetNodeRefs.forEach(({ nodeId, semRank, course }) => {
      const prereqs = extractPrereqs(course);
      prereqs.forEach((prereqIdent) => {
        const normalizedPrereq = normalizeCourseIdent(prereqIdent);
        const normalizedTarget = normalizeCourseIdent(course.courseIdent);
        if (!normalizedPrereq || normalizedPrereq === normalizedTarget) return;

        const candidates = (courseNodeRefsByIdent.get(normalizedPrereq) ?? [])
          .filter((candidate) => candidate.semRank <= semRank)
          .sort((a, b) => b.semRank - a.semRank);
        const prereqNode = candidates[0];
        if (!prereqNode) return;

        const edgeId = `${prereqNode.nodeId}->${nodeId}`;
        if (edgeIds.has(edgeId)) return;
        edgeIds.add(edgeId);

        newEdges.push({
          id: edgeId,
          source: prereqNode.nodeId,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13, color: '#64748b' },
          style: { stroke: '#94a3b8', strokeWidth: 1.6 },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [flowchart, setNodes, setEdges]);

  const onConnect = (params: Edge | Connection) => setEdges((e) => addEdge(params, e));
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.type !== 'course') return;
    const nodeData = node.data as CourseData;
    if (nodeData.course && onCourseSelect) {
      onCourseSelect(nodeData.course);
    }
  };
  const hasRenderableData = nodes.length > 0;

  return (
    <div className="flowchart-shell relative h-[80vh] min-h-[560px] w-full max-w-[1000px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50 shadow-md">
      <div className="pointer-events-none absolute right-3 top-3 z-10 hidden rounded-lg border border-slate-200/90 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-sm md:block">
        <div className="mb-1 font-semibold uppercase tracking-wide text-slate-700">Legend</div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Completed
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          In Progress
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          Planned
        </div>
      </div>

      {!hasRenderableData && (
        <div className="absolute z-10 p-3 text-sm text-slate-600">
          Flowchart loaded, but no renderable courses were found.
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.55}
        maxZoom={1.45}
        fitViewOptions={{ padding: 0.1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          zoomable
          pannable
          nodeColor={(node: Node) => (node.type === 'semester' ? '#cbd5e1' : '#60a5fa')}
          className="!rounded-lg !border !border-slate-200 !bg-white/90"
        />
        <Controls />
        <Background gap={18} color="#dbe3ee" />
      </ReactFlow>
    </div>
  );
}
