import express from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

const port = 3000;
const app = express();
const prisma = new PrismaClient;

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc"
        },
        include: {
            genres: true,
            languages: true
        }
    });
    res.json(movies);
});

app.post("/movies", async (req, res) => {
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    try {
        const movieWithSameTitle = await prisma.movie.findFirst({
            where: { title: { equals: title, mode: "insensitive" } }
        });

        if (movieWithSameTitle) {
            return res.status(409).send({ message: "Filme já cadastrado" });
        }

        await prisma.movie.create({
            data: {
                title,
                genre_id,
                language_id,
                oscar_count,
                release_date: new Date(release_date)
            }
        });
    } catch (error) {
        return res.status(500).send({ message: "falha ao cadastrar um filme" });
    }

    res.status(201).send();
});

app.post("/genres", async (req, res) => {
    const { name } = req.body;

    if (!name) { return res.status(400).send({ message: "O nome do gênero é obrigatório" }); }

    try {
        const existingGenre = await prisma.genre.findFirst({
            where: { name: { equals: name, mode: "insensitive" } }
        });
        if (existingGenre) { return res.status(409).send({ message: "Gênero já cadastrado" }); }

        const newGenre = await prisma.genre.create({
            data: {
                name: name
            }
        });

        res.status(201).json(newGenre);
    } catch (error) {
        return res.status(500).send({ message: "Não foi possível cadastrar o gênero", error });
    }
});

app.put("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({ where: { id } });

        if (!movie) {
            return res.status(404).send({ message: "Filme não encontrado" });
        }

        const data = { ...req.body };
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;

        await prisma.movie.update({
            where: {
                id: id
            },
            data: data
        });
    } catch (error) {
        return res.status(500).send({ message: "falha ao atualizar o registro do filme" });
    }
    res.status(200).send({ message: "Filme atualizado" });
});

app.put("/genres/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name } = req.body;

    if (!name) {
        return res.status(400).send({ message: "O nome do gênero é obrigatório" });
    }

    try {
        const genre = await prisma.genre.findUnique({ where: { id } });

        if (!genre) {
            return res.status(404).send({ message: "Gênero não encontrado" });
        }

        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: { equals: name, mode: "insensitive" },
                id: { not: id }
            }
        });

        if (existingGenre) {
            return res.status(409).send({ message: "Gênero já cadastrado" });
        }

        await prisma.genre.update({
            where: { id },
            data: { name }
        });
    } catch (error) {
        return res.status(500).send({ message: "Falha ao atualizar o gênero" });
    }
    res.status(200).send({ message: "Gênero atualizado" });
});

app.delete("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({ where: { id } });

        if (!movie) {
            return res.status(404).send({ message: "Filme não encontrado" });
        }

        await prisma.movie.delete({ where: { id } });

        res.status(200).send({ message: "Filme deletado" });
    } catch (error) {
        return res.status(500).send({ message: "Não foi possível remover o filme" });
    }
});

app.get("/movies/:genreName", async (req, res) => {
    try {
        const movesFilteredByGenreName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true
            },
            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: "insensitive"
                    }
                }
            }
        });
        res.status(200).send(movesFilteredByGenreName);

    } catch (error) {
        res.status(500).send({ message: "Falha ao filtrar filmes por gênero" });
    }
});

app.listen(port, () => {
    console.log(`Servidor em execução em http://localhost:${port}`);
});