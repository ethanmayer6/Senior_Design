export type CourseflowNavAction = 'friends' | 'logout';

export type CourseflowNavGroupId =
  | 'PLAN'
  | 'CURRENT_SEMESTER'
  | 'EXPLORE'
  | 'PROFILE_SOCIAL'
  | 'MORE';

export type CourseflowNavGroup = {
  id: CourseflowNavGroupId;
  title: string;
  description: string;
};

export type CourseflowNavItem = {
  id: string;
  groupId: CourseflowNavGroupId;
  title: string;
  description: string;
  icon: string;
  to?: string;
  href?: string;
  image?: string;
  action?: CourseflowNavAction;
};

export const courseflowNavGroups: CourseflowNavGroup[] = [
  {
    id: 'PLAN',
    title: 'Plan',
    description: 'Build and adjust your degree plan, semester schedule, and catalog decisions.',
  },
  {
    id: 'CURRENT_SEMESTER',
    title: 'Current Semester',
    description: 'Track what is happening right now with your active classes and schedule.',
  },
  {
    id: 'EXPLORE',
    title: 'Explore',
    description: 'Research majors, courses, and professors before you commit them to your plan.',
  },
  {
    id: 'PROFILE_SOCIAL',
    title: 'Profile & Social',
    description: 'Manage your profile, friends, badges, and personal CourseFlow setup.',
  },
  {
    id: 'MORE',
    title: 'More',
    description: 'Everything helpful but less central to degree planning lives here.',
  },
];

export const courseflowNavItems: CourseflowNavItem[] = [
  {
    id: 'flowchart-dashboard',
    groupId: 'PLAN',
    title: 'Flowchart Dashboard',
    description: 'Import your progress report and keep semester planning in one visual workspace.',
    to: '/dashboard',
    icon: 'pi pi-sitemap',
    image: '/feature-flowchart.svg',
  },
  {
    id: 'smart-scheduler',
    groupId: 'PLAN',
    title: 'Smart Scheduler',
    description: 'Generate draft semester schedule options using your planning constraints.',
    to: '/smart-scheduler',
    icon: 'pi pi-calendar-plus',
    image: '/feature-scheduler.svg',
  },
  {
    id: 'course-catalog',
    groupId: 'PLAN',
    title: 'Course Catalog',
    description: 'Search and explore the full course catalog.',
    to: '/catalog',
    icon: 'pi pi-book',
    image: '/feature-catalog.svg',
  },
  {
    id: 'majors-browse',
    groupId: 'PLAN',
    title: 'Majors Browse',
    description: 'Browse imported majors and inspect requirement structures and option groups.',
    to: '/majors',
    icon: 'pi pi-list',
    image: '/feature-majors.svg',
  },
  {
    id: 'current-classes',
    groupId: 'CURRENT_SEMESTER',
    title: 'Current Classes',
    description: 'Review and manage your imported current class schedule.',
    to: '/current-classes',
    icon: 'pi pi-calendar',
    image: '/feature-current-classes.svg',
  },
  {
    id: 'course-reviews',
    groupId: 'EXPLORE',
    title: 'Course Reviews',
    description: 'Search courses and leave student reviews about workload, difficulty, and outcomes.',
    to: '/course-reviews',
    icon: 'pi pi-comments',
    image: '/feature-course-reviews.svg',
  },
  {
    id: 'professor-reviews',
    groupId: 'EXPLORE',
    title: 'Professor Reviews',
    description: 'Browse professors and leave customizable student reviews.',
    to: '/professors',
    icon: 'pi pi-star',
    image: '/feature-professors.svg',
  },
  {
    id: 'profile',
    groupId: 'PROFILE_SOCIAL',
    title: 'Profile',
    description: 'View and manage your profile details, major, and account information.',
    to: '/profile',
    icon: 'pi pi-id-card',
    image: '/feature-profile.svg',
  },
  {
    id: 'friends-list',
    groupId: 'PROFILE_SOCIAL',
    title: 'Friends List',
    description: 'Open your friends list, view profiles, and add new friends.',
    icon: 'pi pi-users',
    action: 'friends',
    image: '/feature-friends.svg',
  },
  {
    id: 'student-search',
    groupId: 'PROFILE_SOCIAL',
    title: 'Student Search',
    description: 'Find classmates, open profiles, and send friend requests.',
    to: '/student-search',
    icon: 'pi pi-user-plus',
    image: '/feature-friends.svg',
  },
  {
    id: 'course-badges',
    groupId: 'PROFILE_SOCIAL',
    title: 'Course Badges',
    description: 'Explore and track badge opportunities tied to courses.',
    to: '/badges',
    icon: 'pi pi-star',
    image: '/feature-badges.svg',
  },
  {
    id: 'settings',
    groupId: 'PROFILE_SOCIAL',
    title: 'Settings',
    description: 'Update app preferences and personal configuration options.',
    to: '/settings',
    icon: 'pi pi-cog',
    image: '/feature-settings.svg',
  },
  {
    id: 'games',
    groupId: 'MORE',
    title: 'Games',
    description: 'Play the daily puzzle and compare solve times on peer leaderboards.',
    to: '/games',
    icon: 'pi pi-stopwatch',
    image: '/feature-games.svg',
  },
  {
    id: 'dining',
    groupId: 'MORE',
    title: 'Dining Halls',
    description: 'Compare todays live menus across the main campus dining halls before lunch or dinner.',
    to: '/dining',
    icon: 'pi pi-shopping-bag',
    image: '/feature-dining.svg',
  },
  {
    id: 'canvas',
    groupId: 'MORE',
    title: 'Canvas',
    description: 'Open Canvas in a new tab for assignments and class updates.',
    href: 'https://canvas.iastate.edu/',
    icon: 'pi pi-external-link',
    image: '/feature-canvas.svg',
  },
  {
    id: 'campus-map',
    groupId: 'MORE',
    title: 'Campus Map',
    description: 'Open the Iowa State campus map in a new tab.',
    href: 'https://www.fpm.iastate.edu/maps/',
    icon: 'pi pi-map-marker',
    image: '/feature-catalog.svg',
  },
  {
    id: 'log-out',
    groupId: 'MORE',
    title: 'Log out',
    description: 'Sign out of your account and return to the login page.',
    icon: 'pi pi-sign-out',
    action: 'logout',
    image: '/feature-logout.svg',
  },
];
