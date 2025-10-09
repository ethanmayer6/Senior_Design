package com.sdmay19.courseflow;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;



    @Entity
    @Table(name = "TestData")
    class TestData {
        @Id
        private int name;

        public int getName() {
            return name;
        }

        public void setName(int name) {
            this.name = name;
        }
    }

