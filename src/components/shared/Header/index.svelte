<script lang="ts">
    import { page } from '$app/stores';
</script>

<nav class="w-100 bg-gray-500 flex flex-col justify-center items-center h-12">
    <ul class="list-none flex flex-row w-full h-full justify-center items-center">
        <li class:nav-active={ $page.path === '/' } class="nav-link md:h-full"><a class="text-center font-semibold text-gray-100" sveltekit:prefetch href="/">Home</a></li>
        <li class:nav-active={ $page.path === '/todos' } class="nav-link md:h-full"><a class="text-center font-semibold text-gray-100" sveltekit:prefetch href="/todos">Todos</a></li>
    </ul>
</nav>