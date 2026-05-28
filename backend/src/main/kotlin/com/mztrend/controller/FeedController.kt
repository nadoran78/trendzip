package com.mztrend.controller

import com.mztrend.common.ResponseWrapper
import com.mztrend.controller.dto.FeedResponse
import com.mztrend.domain.Generation
import com.mztrend.service.FeedService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/feed")
class FeedController(
    private val feedService: FeedService,
) {
    @GetMapping
    fun getFeed(
        @RequestParam generation: Generation,
    ): ResponseWrapper<FeedResponse> = ResponseWrapper.success(feedService.getFeed(generation))
}
