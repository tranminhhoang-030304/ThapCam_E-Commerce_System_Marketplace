#!/bin/bash
set -e

# Đăng nhập vào Postgres và tạo 2 database độc lập
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE nestjs_db_catalog;
    CREATE DATABASE java_db_order;
    
    -- Cấp quyền (Đã sửa lại đúng tên DB)
    GRANT ALL PRIVILEGES ON DATABASE nestjs_db_catalog TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE java_db_order TO $POSTGRES_USER;
EOSQL