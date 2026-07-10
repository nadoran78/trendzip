package com.mztrend.repository.command

import com.mztrend.domain.KeywordRelation
import org.springframework.data.jpa.repository.JpaRepository

interface KeywordRelationRepository : JpaRepository<KeywordRelation, Long>
