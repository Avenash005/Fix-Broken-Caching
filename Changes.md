# Changes: Fixing Broken Caching in SideHustle Backend

## Issues Identified

1. **Stale Data (No Invalidation)**: Global `global_data_key` Map for all /tasks requests. No clear/invalidation on POST/DELETE → deleted tasks still served from cache.

2. **Promise in Cache**: `/tasks` stored `prisma.task.findMany()` Promise directly → cache served `[object Promise]`.

3. **Null Caching**: `/tasks/:id` cached `null` forever for non-existent tasks.

4. **No TTL/Memory Leak**: Native Map grows unbounded.

5. **Wrong Status Codes**: POST=200 (should 201), DELETE=200+body (should 204).

6. **Swallowed Errors**: `console.log(err)` only → hanging requests, no JSON response.

7. **No Validation**: Invalid id/inputs → Prisma errors.

8. **Inline Logic**: Caching mixed with routes, hard to maintain.

## Improvements Implemented

1. **cacheService.js**: Separate service layer.
   - Namespaced keys: `tasks:list`, `task:1`.
   - TTL (5min default), auto-evict expired.
   - `getOrSet(key, fn)`: Atomic cache-miss → DB → set (no race).
   - `invalidate(prefix)`: Clears matching (e.g., `tasks:list`, `task:*`).
   - No null/undefined cached.

2. **Route Fixes** (`index.js`):
   - `/tasks`: `cacheService.getOrSet('tasks:list', prisma.findMany)` → await safe.
   - `/tasks/:id`: ID parse/validate, 404 on null (no cache null), key `task:${id}`.
   - POST: Input validate, 201, invalidate `tasks:list`.
   - DELETE: ID validate, 204, invalidate `tasks:list` & `task:${id}`.
   - All: `next(err)` → central handler.

3. **Global Error Handler**: 500 JSON `{error: msg}`, logs stack.

4. **PORT**: `process.env.PORT || 5000`.

## Benefits

- **Consistent**: Invalidation + namespacing → fresh data on changes.
- **Reliable**: Await everywhere, null guards, validation → no crashes/stale.
- **Memory-Efficient**: TTL prevents leaks.
- **Predictable**: Proper codes, structured errors.
- **Maintainable**: Service layer.

## Verification

- POST new → shows in /tasks immediately.
- DELETE → gone from list/single.
- Invalid ID → 400/404.
- Errors → 500 JSON.
- Cache hit shown via logs, evicts after TTL.

Test with `npm run dev`, curl/Postman + frontend.
