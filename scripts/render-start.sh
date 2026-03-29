#!/usr/bin/env sh

set -eu

if [ -n "${RENDER_POSTGRES_CONNECTION_STRING:-}" ] && [ -z "${SPRING_DATASOURCE_URL:-}" ]; then
  connection_string="${RENDER_POSTGRES_CONNECTION_STRING#postgres://}"
  connection_string="${connection_string#postgresql://}"
  host_and_database="${connection_string#*@}"
  host_port="${host_and_database%%/*}"
  database_name="${RENDER_POSTGRES_DATABASE:-${host_and_database#*/}}"
  database_name="${database_name%%\?*}"

  export SPRING_DATASOURCE_URL="jdbc:postgresql://${host_port}/${database_name}"
fi

if [ -n "${RENDER_POSTGRES_USER:-}" ] && [ -z "${SPRING_DATASOURCE_USERNAME:-}" ]; then
  export SPRING_DATASOURCE_USERNAME="${RENDER_POSTGRES_USER}"
fi

if [ -n "${RENDER_POSTGRES_PASSWORD:-}" ] && [ -z "${SPRING_DATASOURCE_PASSWORD:-}" ]; then
  export SPRING_DATASOURCE_PASSWORD="${RENDER_POSTGRES_PASSWORD}"
fi

exec java -jar "${COURSEFLOW_JAR_PATH:-target/courseflow-0.0.1-SNAPSHOT.jar}"
