'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LikeButtonOptimized } from '@/components/like-button-optimized'
import { useLikePrefetch } from '@/hooks/use-like-prefetch'
import { Heart, Zap, Activity } from 'lucide-react'

interface DemoPost {
  id: string
  title: string
  initialLikes: number
  initialLiked: boolean
}

export function LikeDemo() {
  const [posts, setPosts] = useState<DemoPost[]>([
    {
      id: '1',
      title: '探索 Next.js 16 的新特性',
      initialLikes: 42,
      initialLiked: false,
    },
    {
      id: '2',
      title: 'React 19 性能优化技巧',
      initialLikes: 38,
      initialLiked: true,
    },
    {
      id: '3',
      title: 'TypeScript 5.0 最佳实践',
      initialLikes: 56,
      initialLiked: false,
    },
    {
      id: '4',
      title: 'Tailwind CSS v4 升级指南',
      initialLikes: 29,
      initialLiked: false,
    },
    {
      id: '5',
      title: 'Supabase 数据库设计技巧',
      initialLikes: 67,
      initialLiked: true,
    },
  ])

  const [stats, setStats] = useState({
    totalClicks: 0,
    successfulOps: 0,
    failedOps: 0,
    avgResponseTime: 0,
  })

  const { batchPrefetchLikeStates } = useLikePrefetch()

  // 组件挂载时预加载所有点赞状态
  useEffect(() => {
    batchPrefetchLikeStates(posts.map(p => p.id))
  }, [batchPrefetchLikeStates, posts])

  // 处理点赞状态变化
  const handleLikeChange = (postId: string, liked: boolean, count: number) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, initialLiked: liked, initialLikes: count } : post
      )
    )

    setStats(prev => ({
      ...prev,
      totalClicks: prev.totalClicks + 1,
      successfulOps: prev.successfulOps + 1,
    }))
  }

  // 批量测试功能
  const testBatchLike = () => {
    setPosts(prev =>
      prev.map(post => ({
        ...post,
        initialLiked: !post.initialLiked,
        initialLikes: post.initialLiked ? post.initialLikes - 1 : post.initialLikes + 1,
      }))
    )

    setStats(prev => ({
      ...prev,
      totalClicks: prev.totalClicks + prev.length,
      successfulOps: prev.successfulOps + prev.length,
    }))
  }

  // 重置所有状态
  const resetAll = () => {
    setPosts([
      {
        id: '1',
        title: '探索 Next.js 16 的新特性',
        initialLikes: 42,
        initialLiked: false,
      },
      {
        id: '2',
        title: 'React 19 性能优化技巧',
        initialLikes: 38,
        initialLiked: true,
      },
      {
        id: '3',
        title: 'TypeScript 5.0 最佳实践',
        initialLikes: 56,
        initialLiked: false,
      },
      {
        id: '4',
        title: 'Tailwind CSS v4 升级指南',
        initialLikes: 29,
        initialLiked: false,
      },
      {
        id: '5',
        title: 'Supabase 数据库设计技巧',
        initialLikes: 67,
        initialLiked: true,
      },
    ])
    setStats({
      totalClicks: 0,
      successfulOps: 0,
      failedOps: 0,
      avgResponseTime: 0,
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 标题和说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            TanStack Query 点赞系统优化演示
          </CardTitle>
          <p className="text-muted-foreground">
            展示了乐观更新、批量操作、预加载等性能优化特性
          </p>
        </CardHeader>
      </Card>

      {/* 统计信息 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            性能统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalClicks}</div>
              <div className="text-sm text-muted-foreground">总点击次数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.successfulOps}</div>
              <div className="text-sm text-muted-foreground">成功操作</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failedOps}</div>
              <div className="text-sm text-muted-foreground">失败操作</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.avgResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-muted-foreground">平均响应时间</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 文章列表 */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{post.title}</h3>
                  <div className="flex items-center gap-4">
                    <Badge variant={post.initialLiked ? "default" : "secondary"}>
                      {post.initialLiked ? "已点赞" : "未点赞"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      点赞数: {post.initialLikes}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* 优化版点赞按钮 */}
                  <LikeButtonOptimized
                    postId={post.id}
                    initialLikeCount={post.initialLikes}
                    initialHasLiked={post.initialLiked}
                    onLikeChange={(liked, count) =>
                      handleLikeChange(post.id, liked, count)
                    }
                  />
                  {/* 使用优化版点赞按钮 */}
                  <LikeButtonOptimized
                    postId={post.id}
                    initialLikeCount={post.initialLikes}
                    initialHasLiked={post.initialLiked}
                    onLikeChange={(liked, count) =>
                      handleLikeChange(post.id, liked, count)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 操作按钮 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <Button onClick={testBatchLike} variant="default">
              <Zap className="h-4 w-4 mr-2" />
              批量测试点赞
            </Button>
            <Button onClick={resetAll} variant="outline">
              重置所有状态
            </Button>
            <Button variant="secondary" disabled>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              收集性能数据...
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            💡 提示：点击点赞按钮体验零延迟响应，批量操作支持高效并发处理
          </p>
        </CardContent>
      </Card>

      {/* 优化特性说明 */}
      <Card>
        <CardHeader>
          <CardTitle>优化特性说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                乐观更新
              </h4>
              <p className="text-sm text-muted-foreground">
                点击后立即更新UI，无需等待服务器响应，提供即时的用户体验
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                自动回滚
              </h4>
              <p className="text-sm text-muted-foreground">
                如果操作失败，自动恢复到之前的状态，保证数据一致性
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                批量操作
              </h4>
              <p className="text-sm text-muted-foreground">
                支持批量处理多个点赞请求，提高并发处理能力
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <div className="h-4 w-4 bg-green-500 rounded-full" />
                预加载
              </h4>
              <p className="text-sm text-muted-foreground">
                在用户需要之前预加载数据，实现瞬时响应
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}